/**
 * 🎙️ USE CONVERSATION MICROPHONE - React Hook for Conversation Domain
 * 
 * Professional React hook that connects to ConversationMicrophoneService.
 * Handles all React-specific concerns for AI conversation recording.
 */

import { useState, useEffect, useCallback } from 'react';
import { conversationMicrophoneService, ConversationMicrophoneOptions } from '@/services/microphone/ConversationMicrophoneService';
import { useToast } from '@/hooks/use-toast';

export const useConversationMicrophone = (options: ConversationMicrophoneOptions = {}) => {
  const [state, setState] = useState(() => conversationMicrophoneService.getState());
  const { toast } = useToast();

  // Subscribe to service state changes
  useEffect(() => {
    const unsubscribe = conversationMicrophoneService.subscribe(() => {
      setState(conversationMicrophoneService.getState());
    });

    return unsubscribe;
  }, []);

  // Initialize service with options
  useEffect(() => {
    conversationMicrophoneService.initialize({
      ...options,
      onRecordingComplete: (audioBlob: Blob) => {
        if (options.onRecordingComplete) {
          options.onRecordingComplete(audioBlob);
        }
      },
      onError: (error: Error) => {
        toast({
          title: "Recording Error",
          description: error.message,
          variant: "destructive",
        });
        
        if (options.onError) {
          options.onError(error);
        }
      }
    });
  }, [options, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      conversationMicrophoneService.forceCleanup();
    };
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    const success = await conversationMicrophoneService.startRecording();
    
    if (!success) {
      toast({
        title: "Microphone Busy",
        description: "Another feature is currently using the microphone. Please try again.",
        variant: "destructive",
      });
    }
    
    return success;
  }, [toast]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    try {
      const audioBlob = await conversationMicrophoneService.stopRecording();
      return audioBlob;
    } catch (error) {
      console.error('[useConversationMicrophone] Stop recording failed:', error);
      toast({
        title: "Recording Error",
        description: "Failed to stop recording properly",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const cancelRecording = useCallback(() => {
    conversationMicrophoneService.cancelRecording();
  }, []);

  return {
    // State
    isRecording: state.isRecording,
    hasStream: state.hasStream,
    hasPermission: state.hasPermission,
    
    // Actions
    startRecording,
    stopRecording,
    cancelRecording,
    
    // Service access (if needed)
    service: conversationMicrophoneService
  };
};
