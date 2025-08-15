/**
 * 📝 USE JOURNAL MICROPHONE - React Hook for Journal Domain
 * 
 * Professional React hook that connects to JournalMicrophoneService.
 * Handles all React-specific concerns for journal voice input.
 */

import { useState, useEffect, useCallback } from 'react';
import { journalMicrophoneService, JournalMicrophoneOptions } from '@/services/microphone/JournalMicrophoneService';
import { useToast } from '@/hooks/use-toast';

export const useJournalMicrophone = (options: JournalMicrophoneOptions = {}) => {
  const [state, setState] = useState(() => journalMicrophoneService.getState());
  const { toast } = useToast();

  // Subscribe to service state changes
  useEffect(() => {
    const unsubscribe = journalMicrophoneService.subscribe(() => {
      setState(journalMicrophoneService.getState());
    });

    return unsubscribe;
  }, []);

  // Initialize service with options
  useEffect(() => {
    journalMicrophoneService.initialize({
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
      journalMicrophoneService.forceCleanup();
    };
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    const success = await journalMicrophoneService.startRecording();
    
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
    journalMicrophoneService.stopRecording();
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
    service: journalMicrophoneService
  };
};
