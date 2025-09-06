/**
 * 🎵 CHAT TEXT REALTIME AUDIO LEVEL HOOK
 * 
 * Auto-attaches when chat microphone starts recording, auto-detaches when stops.
 * Uses the same Web Audio API + AnalyserNode approach as the conversation flow.
 * Stores audio level in ref for direct access without React state updates per frame.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { chatTextMicrophoneService } from '@/services/microphone/ChatTextMicrophoneService';

interface UseChatTextRealtimeAudioLevelOptions {
  targetFPS?: number;
  smoothingFactor?: number;
}

export const useChatTextRealtimeAudioLevel = ({
  targetFPS = 30,
  smoothingFactor = 0.8
}: UseChatTextRealtimeAudioLevelOptions = {}) => {
  const audioLevelRef = useRef<number>(0);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const smoothedLevelRef = useRef<number>(0);

  // 🎵 Initialize by subscribing to service state (new VAD approach)
  const initializeAnalyser = useCallback(async () => {
    // New VAD system provides audio level through service state
    // No need to access AnalyserNode directly
  }, []);

  // 🎵 Cleanup local refs
  const cleanupAnalyser = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    smoothedLevelRef.current = 0;
    audioLevelRef.current = 0;
    lastUpdateTimeRef.current = 0;
  }, []);

  // 🎵 Real-time audio level detection loop (new VAD approach)
  const updateAudioLevel = useCallback(() => {
    if (!isEnabled) {
      animationFrameRef.current = null;
      return;
    }

    const now = performance.now();
    const frameInterval = 1000 / targetFPS;

    // Throttle to target FPS
    if (now - lastUpdateTimeRef.current < frameInterval) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      return;
    }

    lastUpdateTimeRef.current = now;

    try {
      // Get audio level from service state (new VAD approach)
      const serviceState = chatTextMicrophoneService.getState();
      const rawLevel = serviceState.audioLevel;


      // Apply smoothing to prevent jittery animations
      smoothedLevelRef.current = smoothedLevelRef.current * smoothingFactor + rawLevel * (1 - smoothingFactor);

      // Store in ref for direct access (no React state updates per frame)
      audioLevelRef.current = smoothedLevelRef.current;

    } catch (error) {
      console.error('[useChatTextRealtimeAudioLevel] ❌ Error reading audio level:', error);
    }

    // Continue the loop
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, [isEnabled, targetFPS, smoothingFactor]);

  // 🎵 Effect: Auto-attach/detach based on microphone service state
  useEffect(() => {
    const handleMicStateChange = () => {
      const micState = chatTextMicrophoneService.getState();
      setIsEnabled(micState.isRecording);
    };

    // Subscribe to microphone service state changes
    const unsubscribe = chatTextMicrophoneService.subscribe(handleMicStateChange);
    
    // Initialize with current state
    handleMicStateChange();

    return unsubscribe;
  }, []);

  // 🎵 Effect: Initialize when enabled
  useEffect(() => {
    if (isEnabled) {
      initializeAnalyser();
    } else {
      cleanupAnalyser();
    }

    return cleanupAnalyser;
  }, [isEnabled, initializeAnalyser, cleanupAnalyser]);

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

  return audioLevelRef;
};