
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { log } from '@/utils/logStub';

export const useSpeechToText = (
  onTranscriptReady?: (transcript: string) => void,
  onSilenceDetected?: () => void
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isRecordingRef = useRef(false);
  const monitoringRef = useRef(false);
  const { toast } = useToast();

  const processAudio = useCallback(async () => {
    if (audioChunksRef.current.length === 0) {
      log('debug', 'No audio chunks to process');
      return '';
    }

    try {
      setIsProcessing(true);
      log('debug', 'Starting audio processing', { chunks: audioChunksRef.current.length });
      
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
      log('debug', 'Audio blob created', { size: audioBlob.size });
      
      // Convert to base64
      const reader = new FileReader();
      return new Promise<string>((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const base64Audio = (reader.result as string).split(',')[1];
            log('debug', 'Audio converted to base64', { length: base64Audio.length });
            
            const { data, error } = await supabase.functions.invoke('google-speech-to-text', {
              body: {
                audioData: base64Audio,
                config: {
                  encoding: 'WEBM_OPUS',
                  sampleRateHertz: 48000,
                  languageCode: 'en-US',
                  enableAutomaticPunctuation: true,
                  model: 'latest_long',
                  useEnhanced: true,
                  speechContexts: [{
                    phrases: ["therapy", "session", "client", "feelings", "emotions", "breakthrough", "progress"],
                    boost: 10
                  }]
                }
              }
            });

            if (error) {
              log('error', 'Supabase function error', error);
              throw error;
            }

            const transcript = data?.transcript || '';
            log('debug', 'Transcript received', { length: transcript.length });
            
            if (transcript && onTranscriptReady) {
              onTranscriptReady(transcript);
            }
            
            toast({
              title: "Speech converted",
              description: transcript ? "Text has been added to the field" : "No speech detected",
            });
            
            resolve(transcript);
          } catch (error) {
            log('error', 'Error processing speech', error);
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
      log('error', 'Audio processing error', error);
      throw error;
    }
  }, [toast, onTranscriptReady]);

  const monitorSilence = useCallback(() => {
    if (!analyserRef.current || monitoringRef.current) return;
    
    monitoringRef.current = true;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let silenceStart: number | null = null;
    
    const checkSilence = () => {
      if (!isRecordingRef.current || !analyserRef.current) {
        monitoringRef.current = false;
        return;
      }
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate RMS (Root Mean Square) for better audio level detection
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      const normalizedLevel = Math.min(100, (rms / 128) * 100);
      
      setAudioLevel(normalizedLevel);
      
      const silenceThreshold = 8;
      const now = Date.now();
      
      if (rms < silenceThreshold) {
        if (silenceStart === null) {
          silenceStart = now;
          log('debug', 'Silence started');
        } else if (now - silenceStart >= 3000) { // 3 seconds of silence
          log('debug', '3 seconds of silence detected, stopping recording');
          monitoringRef.current = false;
          
          // Trigger silence detected callback immediately
          if (onSilenceDetected) {
            onSilenceDetected();
          }
          
          if (isRecordingRef.current) {
            stopRecording();
          }
          return;
        }
      } else {
        if (silenceStart !== null) {
          log('debug', 'Sound detected, resetting silence timer');
          silenceStart = null;
        }
      }
      
      // Continue monitoring
      requestAnimationFrame(checkSilence);
    };
    
    checkSilence();
  }, [onSilenceDetected]);

  const startRecording = useCallback(async () => {
    try {
      // Skip in SSR environment
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        throw new Error('Speech recognition not available in this environment');
      }
      
      log('debug', 'Starting recording');
      
      // Enhanced audio constraints for better quality
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        } 
      });
      
      // Set up audio context for silence detection
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;
      source.connect(analyserRef.current);
      
      // Enhanced MediaRecorder options
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      isRecordingRef.current = true;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Only log audio chunks in debug mode to reduce console spam
          log('debug', 'Audio data chunk received', { size: event.data.size });
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      
      // Start monitoring for silence
      setTimeout(() => monitorSilence(), 100);
      
      toast({
        title: "Recording started",
        description: "Speak now... Will auto-process after 3 seconds of silence",
      });
    } catch (error) {
      log('error', 'Error starting recording', error);
      isRecordingRef.current = false;
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [toast, monitorSilence]);

  const stopRecording = useCallback((): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      if (!mediaRecorderRef.current || !isRecordingRef.current) {
        log('debug', 'No active recording to stop');
        resolve('');
        return;
      }

      log('debug', 'Stopping recording');
      isRecordingRef.current = false;
      monitoringRef.current = false;

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
          log('debug', 'Recording stopped, processing audio');
          const transcript = await processAudio();
          resolve(transcript);
        } catch (error) {
          log('error', 'Error in onstop handler', error);
          reject(error);
        }
      };

      mediaRecorderRef.current.stop();
      
      // Stop all tracks to release microphone
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      
      setIsRecording(false);
      setAudioLevel(0);
    });
  }, [processAudio]);

  const toggleRecording = useCallback(async () => {
    if (isRecordingRef.current) {
      return stopRecording();
    } else {
      await startRecording();
      return Promise.resolve('');
    }
  }, [startRecording, stopRecording]);

  return {
    isRecording,
    isProcessing,
    audioLevel,
    startRecording,
    stopRecording,
    toggleRecording,
  };
};
