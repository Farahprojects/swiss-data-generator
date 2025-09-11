/**
 * 💬 USE CHAT INPUT MICROPHONE - AudioWorklet + WebWorker Pipeline
 * 
 * Uses the same AudioWorklet + WebWorker pipeline as Conversation Mode
 * for consistent audio processing across the app.
 * 
 * Performance-optimized with ref-based animation pattern:
 * - Worker updates levelRef directly (no re-renders)
 * - requestAnimationFrame loop syncs to React state
 * - Proper silence detection integration
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { ConversationAudioPipeline, encodeWav16kMono } from '@/services/audio/ConversationAudioPipeline';
import { sttService } from '@/services/voice/stt';
import { useChatStore } from '@/core/store';
import { useToast } from '@/hooks/use-toast';

interface UseChatInputMicrophoneOptions {
  onTranscriptReady?: (transcript: string) => void;
  silenceTimeoutMs?: number;
}

export const useChatInputMicrophone = (options: UseChatInputMicrophoneOptions = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const pipelineRef = useRef<ConversationAudioPipeline | null>(null);
  const levelRef = useRef(0);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);
  const { toast } = useToast();
  const chat_id = useChatStore((state) => state.chat_id);

  // RequestAnimationFrame loop for smooth UI animations
  useEffect(() => {
    const tick = () => {
      setAudioLevel(levelRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (isRecording || isProcessing) return false;

    try {
      // Initialize pipeline
      pipelineRef.current = new ConversationAudioPipeline({
        onSpeechStart: () => {
          setIsRecording(true);
          // Clear any existing silence timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }
        },
        onSpeechSegment: async (pcm: Float32Array) => {
          if (isProcessing) return;
          setIsProcessing(true);
          try {
            const wav = encodeWav16kMono(pcm, 16000);
            const result = await sttService.transcribe(wav, chat_id, {}, 'chat');
            const transcript = result.transcript?.trim();
            
            if (transcript && options.onTranscriptReady) {
              options.onTranscriptReady(transcript);
            }
          } catch (error) {
            console.error('[useChatInputMicrophone] STT failed:', error);
            toast({
              title: "Transcription Failed",
              description: "Could not transcribe audio. Please try again.",
              variant: "destructive",
            });
          } finally {
            setIsProcessing(false);
            stopRecording();
          }
        },
        onLevel: (level) => {
          // Update ref directly - no React state updates per audio frame
          levelRef.current = level;
          
          
          // Silence detection: if level is very low for extended period
          const silenceThreshold = 0.01; // Adjust as needed
          const silenceTimeout = options.silenceTimeoutMs || 800;
          
          if (level < silenceThreshold && isRecording && !isProcessing) {
            // Start or extend silence timeout
            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current);
            }
            silenceTimeoutRef.current = setTimeout(() => {
              console.log('[useChatInputMicrophone] Silence detected, stopping recording');
              stopRecording();
            }, silenceTimeout);
          } else if (level >= silenceThreshold) {
            // Clear silence timeout when speech is detected
            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current);
              silenceTimeoutRef.current = null;
            }
          }
        },
        onError: (error: Error) => {
          console.error('[useChatInputMicrophone] Pipeline error:', error);
          toast({
            title: "Microphone Error",
            description: "Could not access microphone. Please check permissions.",
            variant: "destructive",
          });
          stopRecording();
        }
      });

      await pipelineRef.current.init();
      await pipelineRef.current.start();
      
      // Set recording state immediately when pipeline starts
      setIsRecording(true);
      return true;
    } catch (error) {
      console.error('[useChatInputMicrophone] Start failed:', error);
      toast({
        title: "Microphone Busy",
        description: "Another feature is currently using the microphone. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [isRecording, isProcessing, chat_id, options.onTranscriptReady, options.silenceTimeoutMs, toast]);

  const stopRecording = useCallback(() => {
    // Clear silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (pipelineRef.current) {
      pipelineRef.current.dispose();
      pipelineRef.current = null;
    }
    setIsRecording(false);
    setIsProcessing(false);
    levelRef.current = 0;
  }, []);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    // State
    isRecording,
    isProcessing,
    audioLevel, // Now properly synced via requestAnimationFrame
    
    // Actions
    startRecording,
    stopRecording,
    toggleRecording,
    
    // Audio level ref for direct access (updated by worker)
    audioLevelRef: levelRef
  };
};