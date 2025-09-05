/**
 * 🎵 CONVERSATION REALTIME AUDIO LEVEL HOOK
 * 
 * Custom hook that provides real-time audio level for conversation mode.
 * Uses the same Web Audio API + AnalyserNode approach as the main mic button flow.
 * Updates React state at a reasonable rate (not per frame) for smooth animation.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';

interface UseConversationRealtimeAudioLevelOptions {
  enabled: boolean;
  updateIntervalMs?: number; // How often to update React state (default: 50ms = 20fps)
  smoothingFactor?: number;
}

export const useConversationRealtimeAudioLevel = ({
  enabled,
  updateIntervalMs = 50, // 20fps for React state updates
  smoothingFactor = 0.8
}: UseConversationRealtimeAudioLevelOptions) => {
  const [audioLevel, setAudioLevel] = useState<number>(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const smoothedLevelRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);

  // 🎵 Initialize AudioContext and AnalyserNode
  const initializeAudioContext = useCallback(async () => {
    const stream = conversationMicrophoneService.getStream();
    if (!stream || audioContextRef.current) {
      // Stream not available yet or already initialized
      return;
    }

    try {
      // Create AudioContext with mobile-optimized settings
      audioContextRef.current = new AudioContext({ 
        sampleRate: 16000, // Mobile-first: 16kHz for faster processing
        latencyHint: 'interactive'
      });

      // Create AnalyserNode with mobile-optimized settings
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 1024; // Mobile-first: Smaller FFT for faster analysis
      analyserRef.current.smoothingTimeConstant = smoothingFactor;

      // Create MediaStreamSource and connect to analyser
      mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      mediaStreamSourceRef.current.connect(analyserRef.current);

      // Resume AudioContext if suspended (helps on iOS)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
    } catch (error) {
      console.error('[useConversationRealtimeAudioLevel] ❌ Failed to initialize AudioContext:', error);
    }
  }, [smoothingFactor]);

  // 🎵 Cleanup AudioContext
  const cleanupAudioContext = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    smoothedLevelRef.current = 0;
    lastUpdateTimeRef.current = 0;
  }, []);

  // 🎵 Real-time audio level detection loop
  const updateAudioLevel = useCallback(() => {
    if (!enabled || !analyserRef.current) {
      animationFrameRef.current = null;
      return;
    }

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

    } catch (error) {
      console.error('[useConversationRealtimeAudioLevel] ❌ Error reading audio data:', error);
    }

    // Continue the loop
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, [enabled, smoothingFactor]);

  // 🎵 Update React state at reasonable interval
  const updateReactState = useCallback(() => {
    setAudioLevel(smoothedLevelRef.current);
  }, []);

  // 🎵 Effect: Initialize when enabled
  useEffect(() => {
    if (enabled) {
      initializeAudioContext();
    } else {
      cleanupAudioContext();
      setAudioLevel(0);
    }

    return cleanupAudioContext;
  }, [enabled, initializeAudioContext, cleanupAudioContext]);

  // 🎵 Effect: Start/stop audio level detection
  useEffect(() => {
    if (enabled && analyserRef.current && !animationFrameRef.current) {
      updateAudioLevel();
    } else if (!enabled && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [enabled, updateAudioLevel]);

  // 🎵 Effect: Start/stop React state updates
  useEffect(() => {
    if (enabled && !intervalRef.current) {
      intervalRef.current = window.setInterval(updateReactState, updateIntervalMs);
    } else if (!enabled && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, updateIntervalMs, updateReactState]);

  return audioLevel;
};
