/**
 * 💬 USE CHAT TEXT MICROPHONE - React Hook for Chat Text Domain
 * 
 * Professional React hook that connects to ChatTextMicrophoneService.
 * Handles all React-specific concerns for chat text voice input.
 */

import { useState, useEffect, useCallback } from 'react';
import { chatTextMicrophoneService, ChatTextMicrophoneOptions } from '@/services/microphone/ChatTextMicrophoneService';
import { useToast } from '@/hooks/use-toast';

export const useChatTextMicrophone = (options: ChatTextMicrophoneOptions = {}) => {
  const [state, setState] = useState(() => chatTextMicrophoneService.getState());
  const { toast } = useToast();

  // Subscribe to service state changes
  useEffect(() => {
    const unsubscribe = chatTextMicrophoneService.subscribe(() => {
      setState(chatTextMicrophoneService.getState());
    });

    return unsubscribe;
  }, []);

  // Initialize service with options
  useEffect(() => {
    chatTextMicrophoneService.initialize({
      ...options,
      onTranscriptReady: (transcript: string) => {
        if (options.onTranscriptReady) {
          options.onTranscriptReady(transcript);
        }
      },
      onSilenceDetected: () => {
        if (options.onSilenceDetected) {
          options.onSilenceDetected();
        }
      }
    });
  }, [options]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      chatTextMicrophoneService.forceCleanup();
    };
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    const success = await chatTextMicrophoneService.startRecording();
    
    if (!success) {
      toast({
        title: "Microphone Busy",
        description: "Another feature is currently using the microphone. Please try again.",
        variant: "destructive",
      });
    }
    
    return success;
  }, [toast]);

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
    
    // Service access (if needed)
    service: chatTextMicrophoneService
  };
};
