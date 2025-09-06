/**
 * 💬 USE CHAT TEXT MICROPHONE - Combined Hook for Microphone Control + Audio Level Animation
 * 
 * Single hook that handles both microphone control and real-time audio level detection.
 * Only initializes when actually needed (when mic icon is pressed).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { chatTextMicrophoneService, ChatTextMicrophoneOptions } from '@/services/microphone/ChatTextMicrophoneService';
import { useToast } from '@/hooks/use-toast';

interface UseChatTextMicrophoneOptions extends ChatTextMicrophoneOptions {
  targetFPS?: number;
  smoothingFactor?: number;
}

export const useChatTextMicrophone = (options: UseChatTextMicrophoneOptions = {}) => {
  const [state, setState] = useState(() => chatTextMicrophoneService.getState());
  const { toast } = useToast();
  
  // Audio level animation refs
  const audioLevelRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const smoothedLevelRef = useRef<number>(0);
  
  const { targetFPS = 30, smoothingFactor = 0.8, ...micOptions } = options;

  // Subscribe to service state changes
  useEffect(() => {
    const unsubscribe = chatTextMicrophoneService.subscribe(() => {
      setState(chatTextMicrophoneService.getState());
    });

    return unsubscribe;
  }, []);

  // Real-time audio level detection loop
  const updateAudioLevel = useCallback(() => {
    if (!state.isRecording) {
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
      // Get audio level from service state
      const serviceState = chatTextMicrophoneService.getState();
      const rawLevel = serviceState.audioLevel;

      // Apply smoothing to prevent jittery animations
      smoothedLevelRef.current = smoothedLevelRef.current * smoothingFactor + rawLevel * (1 - smoothingFactor);

      // Store in ref for direct access (no React state updates per frame)
      audioLevelRef.current = smoothedLevelRef.current;

    } catch (error) {
      console.error('[useChatTextMicrophone] ❌ Error reading audio level:', error);
    }

    // Continue the loop
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, [state.isRecording, targetFPS, smoothingFactor]);

  // Start/stop audio level detection based on recording state
  useEffect(() => {
    if (state.isRecording && !animationFrameRef.current) {
      updateAudioLevel();
    } else if (!state.isRecording && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [state.isRecording, updateAudioLevel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      chatTextMicrophoneService.forceCleanup();
    };
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    // Initialize service only when actually starting recording
    chatTextMicrophoneService.initialize({
      ...micOptions,
      onTranscriptReady: (transcript: string) => {
        if (micOptions.onTranscriptReady) {
          micOptions.onTranscriptReady(transcript);
        }
      },
      onSilenceDetected: () => {
        if (micOptions.onSilenceDetected) {
          micOptions.onSilenceDetected();
        }
      }
    });
    
    const success = await chatTextMicrophoneService.startRecording();
    
    if (!success) {
      toast({
        title: "Microphone Busy",
        description: "Another feature is currently using the microphone. Please try again.",
        variant: "destructive",
      });
    }
    
    return success;
  }, [toast, micOptions]);

  const stopRecording = useCallback(() => {
    chatTextMicrophoneService.stopRecording();
  }, []);

  const toggleRecording = useCallback(async () => {
    if (state.isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [state.isRecording, startRecording, stopRecording]);

  return {
    // State
    isRecording: state.isRecording,
    isProcessing: state.isProcessing,
    audioLevel: state.audioLevel,
    
    // Actions
    startRecording,
    stopRecording,
    toggleRecording,
    
    // Audio level ref for animation
    audioLevelRef,
    
    // Service access (if needed)
    service: chatTextMicrophoneService
  };
};
