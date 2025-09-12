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
    if (isRecording || isProcessing) return false;

    try {
      // Check secure context
      const isLocalhost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
      if (typeof window !== 'undefined' && !window.isSecureContext && !isLocalhost) {
        toast({
          title: 'Microphone Requires HTTPS',
          description: 'Open over HTTPS or use localhost to allow microphone access.',
          variant: 'destructive',
        });
        return false;
      }

      // Check getUserMedia support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: 'Microphone Unsupported',
          description: 'getUserMedia is not available in this browser.',
          variant: 'destructive',
        });
        return false;
      }

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
    if (isRecording) {
      stopRecording();
    } else {
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