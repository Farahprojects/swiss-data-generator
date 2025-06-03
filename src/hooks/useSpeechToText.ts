
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSpeechToText = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const { toast } = useToast();

  const processAudio = useCallback(async () => {
    if (audioChunksRef.current.length === 0) {
      return '';
    }

    try {
      setIsProcessing(true);
      
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert to base64
      const reader = new FileReader();
      return new Promise<string>((resolve, reject) => {
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
      });
    } catch (error) {
      setIsProcessing(false);
      throw error;
    }
  }, [toast]);

  const monitorSilence = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkSilence = () => {
      if (!isRecording || !analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const silenceThreshold = 5; // Adjust this value as needed
      
      if (average < silenceThreshold) {
        // Start or continue silence timer
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(async () => {
            if (isRecording) {
              await stopRecording();
            }
          }, 3000); // 3 seconds of silence
        }
      } else {
        // Reset silence timer if sound is detected
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      }
      
      // Continue monitoring
      requestAnimationFrame(checkSilence);
    };
    
    checkSilence();
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio context for silence detection
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
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
      
      // Start monitoring for silence
      monitorSilence();
      
      toast({
        title: "Recording started",
        description: "Speak now... Will auto-process after 3 seconds of silence",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [toast, monitorSilence]);

  const stopRecording = useCallback((): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      if (!mediaRecorderRef.current || !isRecording) {
        reject(new Error('No active recording'));
        return;
      }

      // Clear silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      // Clean up audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      mediaRecorderRef.current.onstop = async () => {
        try {
          const transcript = await processAudio();
          resolve(transcript);
        } catch (error) {
          reject(error);
        }
      };

      mediaRecorderRef.current.stop();
      
      // Stop all tracks to release microphone
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      
      setIsRecording(false);
    });
  }, [isRecording, processAudio]);

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
