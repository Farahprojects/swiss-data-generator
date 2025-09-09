/**
 * 💬 USE CHAT INPUT MICROPHONE - AudioWorklet + WebWorker Pipeline
 * 
 * Uses the same AudioWorklet + WebWorker pipeline as Conversation Mode
 * for consistent audio processing across the app.
 */

import { useState, useCallback, useRef } from 'react';
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
  const { toast } = useToast();
  const chat_id = useChatStore((state) => state.chat_id);

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (isRecording || isProcessing) return false;

    try {
      // Initialize pipeline
      pipelineRef.current = new ConversationAudioPipeline({
        onSpeechStart: () => {
          setIsRecording(true);
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
          setAudioLevel(level);
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
  }, [isRecording, isProcessing, chat_id, options.onTranscriptReady, toast]);

  const stopRecording = useCallback(() => {
    if (pipelineRef.current) {
      pipelineRef.current.dispose();
      pipelineRef.current = null;
    }
    setIsRecording(false);
    setIsProcessing(false);
    setAudioLevel(0);
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
    audioLevel,
    
    // Actions
    startRecording,
    stopRecording,
    toggleRecording,
    
    // Audio level ref for animation (compatibility)
    audioLevelRef: { current: audioLevel }
  };
};
