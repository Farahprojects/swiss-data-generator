// Simple universal microphone hook - no chunks, no rolling buffer

import { useState, useCallback, useRef, useEffect } from 'react';
import { UniversalSTTRecorder } from '@/services/audio/UniversalSTTRecorder';
import { useToast } from '@/hooks/use-toast';

interface UseUniversalMicOptions {
  onTranscriptReady?: (transcript: string) => void;
  silenceThreshold?: number;
  silenceDuration?: number;
}

export const useUniversalMic = (options: UseUniversalMicOptions = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const recorderRef = useRef<UniversalSTTRecorder | null>(null);
  const levelRef = useRef(0);
  const { toast } = useToast();

  // Smooth UI animations
  useEffect(() => {
    const tick = () => {
      setAudioLevel(levelRef.current);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    console.log('[useUniversalMic] startRecording called - isRecording:', isRecording, 'isProcessing:', isProcessing);
    if (isRecording || isProcessing) return false;

    try {
      console.log('[useUniversalMic] Checking permissions and support...');

      // Check secure context
      if (!window.isSecureContext && location.hostname !== 'localhost') {
        throw new Error('Microphone requires HTTPS or localhost');
      }

      // Check getUserMedia support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported');
      }

      // Check current permission state
      let permissionState = 'unknown';
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        permissionState = result.state;
        console.log('[useUniversalMic] Permission state:', permissionState);
      } catch (permError) {
        console.log('[useUniversalMic] Permission query not supported, proceeding with getUserMedia');
      }

      recorderRef.current = new UniversalSTTRecorder({
        onTranscriptReady: (transcript) => {
          console.log('[useUniversalMic] Transcript ready:', transcript);
          setIsRecording(false);
          setIsProcessing(false);
          options.onTranscriptReady?.(transcript);
        },
        onError: (error) => {
          console.error('[useUniversalMic] Recorder error:', error);
          
          let errorMessage = 'Could not access microphone.';
          if (error.message.includes('Permission denied') || error.message.includes('NotAllowedError')) {
            errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
          } else if (error.message.includes('NotFoundError')) {
            errorMessage = 'No microphone found. Please connect a microphone and try again.';
          } else if (error.message.includes('NotReadableError')) {
            errorMessage = 'Microphone is being used by another application.';
          }
          
          toast({
            title: 'Microphone Error',
            description: errorMessage,
            variant: 'destructive',
          });
          setIsRecording(false);
          setIsProcessing(false);
        },
        onLevel: (level) => {
          levelRef.current = level;
        },
        silenceThreshold: options.silenceThreshold || 0.02,
        silenceDuration: options.silenceDuration || 1200,
      });

      await recorderRef.current.start();
      setIsRecording(true);
      console.log('[useUniversalMic] Recording started successfully');
      return true;

    } catch (error) {
      console.error('[useUniversalMic] Start recording failed:', error);
      
      let errorMessage = 'Please allow microphone access and try again.';
      if (error instanceof Error) {
        if (error.message.includes('Permission denied') || error.message.includes('NotAllowedError')) {
          errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
        } else if (error.message.includes('NotFoundError')) {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else if (error.message.includes('NotReadableError')) {
          errorMessage = 'Microphone is being used by another application.';
        } else if (error.message.includes('HTTPS')) {
          errorMessage = 'Microphone access requires HTTPS. Please use a secure connection.';
        }
      }
      
      toast({
        title: 'Microphone Access Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsProcessing(false);
      return false;
    }
  }, [isRecording, isProcessing, options, toast]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current) {
      // Fully stop media source for chat bar use-case
      recorderRef.current.dispose();
      recorderRef.current = null;
    }
    setIsRecording(false);
    setIsProcessing(false);
    levelRef.current = 0;
  }, []);

  const toggleRecording = useCallback(async () => {
    console.log('[useUniversalMic] Toggle called - isRecording:', isRecording);
    if (isRecording) {
      console.log('[useUniversalMic] Stopping recording...');
      stopRecording();
    } else {
      console.log('[useUniversalMic] Starting recording...');
      setIsProcessing(true);
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        recorderRef.current.dispose();
        recorderRef.current = null;
      }
    };
  }, []);

  return {
    isRecording,
    isProcessing,
    audioLevel,
    startRecording,
    stopRecording,
    toggleRecording,
    audioLevelRef: levelRef
  };
};