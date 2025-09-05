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
  
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const smoothedLevelRef = useRef<number>(0);

  // 🎵 Initialize analyser by reusing service's AnalyserNode (read-only)
  const initializeAnalyser = useCallback(async () => {
    if (analyserRef.current) return;
    try {
      const existingAnalyser = chatTextMicrophoneService.getAnalyser();
      if (!existingAnalyser) return;
      existingAnalyser.smoothingTimeConstant = smoothingFactor;
      analyserRef.current = existingAnalyser;
    } catch (error) {
      console.error('[useChatTextRealtimeAudioLevel] ❌ Failed to initialize analyser:', error);
    }
  }, [smoothingFactor]);

  // 🎵 Cleanup local refs (service owns the graph)
  const cleanupAnalyser = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    analyserRef.current = null;
    smoothedLevelRef.current = 0;
    audioLevelRef.current = 0;
    lastUpdateTimeRef.current = 0;
  }, []);

  // 🎵 Real-time audio level detection loop
  const updateAudioLevel = useCallback(() => {
    if (!isEnabled || !analyserRef.current) {
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
      // Get audio data
      const bufferLength = analyserRef.current.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteTimeDomainData(dataArray);

      // Calculate RMS (Root Mean Square) for audio level
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        const centered = (dataArray[i] - 128) / 128; // Center around 0
        sumSquares += centered * centered;
      }
      const rms = Math.sqrt(sumSquares / bufferLength);

      // Apply smoothing to prevent jittery animations
      smoothedLevelRef.current = smoothedLevelRef.current * smoothingFactor + rms * (1 - smoothingFactor);

      // Store in ref for direct access (no React state updates per frame)
      audioLevelRef.current = smoothedLevelRef.current;

    } catch (error) {
      console.error('[useChatTextRealtimeAudioLevel] ❌ Error reading audio data:', error);
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
    if (isEnabled && analyserRef.current && !animationFrameRef.current) {
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