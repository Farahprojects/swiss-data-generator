/**
 * 🎵 CONVERSATION REALTIME AUDIO LEVEL HOOK
 * 
 * Auto-attaches when microphone starts recording, auto-detaches when stops.
 * Uses the same Web Audio API + AnalyserNode approach as the main mic button flow.
 * Updates React state at a reasonable rate (not per frame) for smooth animation.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';

interface UseConversationRealtimeAudioLevelOptions {
  updateIntervalMs?: number; // How often to update React state (default: 50ms = 20fps)
  smoothingFactor?: number;
}

export const useConversationRealtimeAudioLevel = ({
  updateIntervalMs = 50, // 20fps for React state updates
  smoothingFactor = 0.8
}: UseConversationRealtimeAudioLevelOptions = {}) => {
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const smoothedLevelRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);

  // 🎵 Initialize (WebWorkerVAD handles audio level internally)
  const initializeAudioContext = useCallback(async () => {
    // WebWorkerVAD handles audio level detection internally
    // We just need to start polling the service's audio level
  }, []);

  // 🎵 Cleanup (no AudioContext to clean up since we reuse the service's)
  const cleanupAudioContext = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // No cleanup needed since WebWorkerVAD handles everything internally
    smoothedLevelRef.current = 0;
    lastUpdateTimeRef.current = 0;
  }, []);

  // 🎵 Real-time audio level detection loop (get from service)
  const updateAudioLevel = useCallback(() => {
    if (!isEnabled) {
      animationFrameRef.current = null;
      return;
    }

    try {
      // Get audio level from the microphone service (WebWorkerVAD)
      const micState = conversationMicrophoneService.getState();
      const currentLevel = micState.audioLevel || 0;

      // Apply smoothing to prevent jittery animations
      smoothedLevelRef.current = smoothedLevelRef.current * smoothingFactor + currentLevel * (1 - smoothingFactor);

    } catch (error) {
      console.error('[useConversationRealtimeAudioLevel] ❌ Error getting audio level:', error);
    }

    // Continue the loop
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, [isEnabled, smoothingFactor]);

  // 🎵 Update React state at reasonable interval
  const updateReactState = useCallback(() => {
    setAudioLevel(smoothedLevelRef.current);
  }, []);

  // 🎵 Effect: Auto-attach/detach based on microphone service state
  useEffect(() => {
    const handleMicStateChange = () => {
      const micState = conversationMicrophoneService.getState();
      // Enabled whenever VAD is active (not just when recording)
      setIsEnabled(micState.hasVAD && micState.hasStream);
    };

    // Subscribe to microphone service state changes
    const unsubscribe = conversationMicrophoneService.subscribe(handleMicStateChange);
    
    // Initialize with current state
    handleMicStateChange();

    return unsubscribe;
  }, []);

  // 🎵 Effect: Initialize when enabled
  useEffect(() => {
    if (isEnabled) {
      initializeAudioContext();
    } else {
      cleanupAudioContext();
      setAudioLevel(0);
    }

    return cleanupAudioContext;
  }, [isEnabled, initializeAudioContext, cleanupAudioContext]);

  // 🎵 Effect: Start/stop audio level detection
  useEffect(() => {
    if (isEnabled && !animationFrameRef.current) {
      updateAudioLevel();
    } else if (!isEnabled && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isEnabled, updateAudioLevel]);

  // 🎵 Effect: Start/stop React state updates
  useEffect(() => {
    if (isEnabled && !intervalRef.current) {
      intervalRef.current = window.setInterval(updateReactState, updateIntervalMs);
    } else if (!isEnabled && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isEnabled, updateIntervalMs, updateReactState]);

  return audioLevel;
};
