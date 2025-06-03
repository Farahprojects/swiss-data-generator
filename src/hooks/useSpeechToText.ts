
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSpeechToText = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Speak now...",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current || !isRecording) {
        reject(new Error('No active recording'));
        return;
      }

      mediaRecorderRef.current.onstop = async () => {
        try {
          setIsProcessing(true);
          
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Convert to base64
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64Audio = (reader.result as string).split(',')[1];
              
              const { data, error } = await supabase.functions.invoke('google-speech-to-text', {
                body: {
                  audioData: base64Audio,
                  config: {
                    encoding: 'WEBM_OPUS',
                    sampleRateHertz: 48000,
                    languageCode: 'en-US',
                    enableAutomaticPunctuation: true,
                  }
                }
              });

              if (error) {
                throw error;
              }

              const transcript = data?.transcript || '';
              
              toast({
                title: "Speech converted",
                description: transcript ? "Text has been added to the field" : "No speech detected",
              });
              
              resolve(transcript);
            } catch (error) {
              console.error('Error processing speech:', error);
              toast({
                title: "Error",
                description: "Failed to convert speech to text",
                variant: "destructive",
              });
              reject(error);
            } finally {
              setIsProcessing(false);
            }
          };
          
          reader.readAsDataURL(audioBlob);
        } catch (error) {
          setIsProcessing(false);
          reject(error);
        }
      };

      mediaRecorderRef.current.stop();
      
      // Stop all tracks to release microphone
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      
      setIsRecording(false);
    });
  }, [isRecording, toast]);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      return stopRecording();
    } else {
      await startRecording();
      return Promise.resolve('');
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    toggleRecording,
  };
};
