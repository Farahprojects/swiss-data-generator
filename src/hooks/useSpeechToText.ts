
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSpeechToText = (onTranscriptReady?: (transcript: string) => void) => {
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
      console.log('No audio chunks to process');
      return '';
    }

    try {
      setIsProcessing(true);
      console.log('Starting audio processing...');
      
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log('Audio blob created, size:', audioBlob.size);
      
      // Convert to base64
      const reader = new FileReader();
      return new Promise<string>((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64Audio = (reader.result as string).split(',')[1];
            console.log('Audio converted to base64, length:', base64Audio.length);
            
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
              console.error('Supabase function error:', error);
              throw error;
            }

            const transcript = data?.transcript || '';
            console.log('Transcript received:', transcript);
            
            if (transcript && onTranscriptReady) {
              onTranscriptReady(transcript);
            }
            
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
      console.error('Audio processing error:', error);
      throw error;
    }
  }, [toast, onTranscriptReady]);

  const monitorSilence = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkSilence = () => {
      if (!isRecording || !analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const silenceThreshold = 5;
      
      console.log('Audio level:', average);
      
      if (average < silenceThreshold) {
        // Start or continue silence timer
        if (!silenceTimerRef.current) {
          console.log('Starting silence timer...');
          silenceTimerRef.current = setTimeout(async () => {
            console.log('Silence detected, stopping recording...');
            if (isRecording) {
              await stopRecording();
            }
          }, 3000); // 3 seconds of silence
        }
      } else {
        // Reset silence timer if sound is detected
        if (silenceTimerRef.current) {
          console.log('Sound detected, resetting silence timer');
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
      console.log('Starting recording...');
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
          console.log('Audio data chunk received:', event.data.size);
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
        console.log('No active recording to stop');
        resolve('');
        return;
      }

      console.log('Stopping recording...');

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
          console.log('Recording stopped, processing audio...');
          const transcript = await processAudio();
          resolve(transcript);
        } catch (error) {
          console.error('Error in onstop handler:', error);
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
