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
      // Skip HTTPS check for now - allow HTTP for testing
      console.log('[useUniversalMic] Checking getUserMedia support...');

      // Check getUserMedia support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('[useUniversalMic] getUserMedia not supported');
        toast({
          title: 'Microphone Unsupported',
          description: 'getUserMedia is not available in this browser.',
          variant: 'destructive',
        });
        return false;
      }
      console.log('[useUniversalMic] getUserMedia is supported');

      recorderRef.current = new UniversalSTTRecorder({
        onTranscriptReady: (transcript) => {
          setIsProcessing(false);
          options.onTranscriptReady?.(transcript);
        },
        onError: (error) => {
          toast({
            title: 'Microphone Error',
            description: 'Could not access microphone. Please check permissions.',
            variant: 'destructive',
          });
          setIsRecording(false);
          setIsProcessing(false);
        },
        onLevel: (level) => {
          levelRef.current = level;
        },
        silenceThreshold: options.silenceThreshold || 0.01,
        silenceDuration: options.silenceDuration || 1200,
      });

      await recorderRef.current.start();
      setIsRecording(true);
      return true;

    } catch (error) {
      toast({
        title: 'Microphone Access Denied',
        description: 'Please allow microphone access and try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [isRecording, isProcessing, options, toast]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stop();
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