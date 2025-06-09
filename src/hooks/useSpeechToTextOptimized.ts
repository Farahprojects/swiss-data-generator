
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AudioUtils } from '@/utils/audioUtils';

interface SpeechToTextConfig {
  silenceThreshold?: number;
  silenceTimeout?: number;
  maxRecordingTime?: number;
  audioAnalysisInterval?: number;
}

export const useSpeechToTextOptimized = (
  onTranscriptReady?: (transcript: string) => void,
  onSilenceDetected?: () => void,
  config: SpeechToTextConfig = {}
) => {
  const {
    silenceThreshold = 8,
    silenceTimeout = 3000,
    maxRecordingTime = 60000,
    audioAnalysisInterval = 100
  } = config;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isRecordingRef = useRef(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const { toast } = useToast();

  // Optimized silence detection with reduced frequency
  const debouncedSilenceCheck = useCallback(
    AudioUtils.debounce(() => {
      if (!analyserRef.current || !isRecordingRef.current) return;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const rms = AudioUtils.calculateRMSEfficient(dataArray);
      const normalizedLevel = Math.min(100, (rms / 128) * 100);
      
      setAudioLevel(normalizedLevel);
      
      if (rms < silenceThreshold) {
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            if (isRecordingRef.current && onSilenceDetected) {
              onSilenceDetected();
              stopRecording();
            }
          }, silenceTimeout);
        }
      } else {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      }
    }, audioAnalysisInterval),
    [silenceThreshold, silenceTimeout, audioAnalysisInterval, onSilenceDetected]
  );

  const startSilenceMonitoring = useCallback(() => {
    const monitor = () => {
      if (isRecordingRef.current) {
        debouncedSilenceCheck();
        animationFrameRef.current = requestAnimationFrame(monitor);
      }
    };
    monitor();
  }, [debouncedSilenceCheck]);

  const processAudio = useCallback(async (): Promise<string> => {
    if (audioChunksRef.current.length === 0) {
      console.log('No audio chunks to process');
      return '';
    }

    try {
      setIsProcessing(true);
      console.log('Starting optimized audio processing...');
      
      // Use Web Worker for audio processing
      const base64Audio = await AudioUtils.processAudioWithWorker(audioChunksRef.current);
      console.log('Audio processed with Web Worker, length:', base64Audio.length);
      
      const { data, error } = await supabase.functions.invoke('google-speech-to-text', {
        body: {
          audioData: base64Audio,
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: 'en-US',
            enableAutomaticPunctuation: true,
            model: 'latest_short', // Faster model for real-time use
            useEnhanced: false, // Disable for speed
            speechContexts: [{
              phrases: ["therapy", "session", "client", "feelings", "emotions", "breakthrough", "progress"],
              boost: 5 // Reduced boost for speed
            }]
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
        description: transcript ? "Text has been added" : "No speech detected",
      });
      
      return transcript;
    } catch (error) {
      console.error('Error processing speech:', error);
      toast({
        title: "Error",
        description: "Failed to convert speech to text",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsProcessing(false);
      // Clear audio chunks immediately after processing
      audioChunksRef.current = [];
    }
  }, [toast, onTranscriptReady]);

  const startRecording = useCallback(async () => {
    try {
      console.log('Starting optimized recording...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        } 
      });
      
      // Use optimized audio context
      audioContextRef.current = AudioUtils.optimizeAudioContext(48000);
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = AudioUtils.createOptimizedAnalyser(audioContextRef.current);
      source.connect(analyserRef.current);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      isRecordingRef.current = true;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      
      // Start optimized silence monitoring
      startSilenceMonitoring();
      
      // Set maximum recording time
      recordingTimerRef.current = setTimeout(() => {
        if (isRecordingRef.current) {
          console.log('Maximum recording time reached, stopping...');
          stopRecording();
        }
      }, maxRecordingTime);
      
      toast({
        title: "Recording started",
        description: "Speak now... Will auto-process after silence",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      isRecordingRef.current = false;
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  }, [toast, startSilenceMonitoring, maxRecordingTime]);

  const stopRecording = useCallback((): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      if (!mediaRecorderRef.current || !isRecordingRef.current) {
        resolve('');
        return;
      }

      console.log('Stopping optimized recording...');
      isRecordingRef.current = false;

      // Clear all timers
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      if (recordingTimerRef.current) {
        clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      mediaRecorderRef.current.onstop = async () => {
        try {
          const transcript = await processAudio();
          resolve(transcript);
        } catch (error) {
          reject(error);
        } finally {
          // Cleanup resources
          AudioUtils.cleanup(mediaRecorderRef.current, audioContextRef.current);
          mediaRecorderRef.current = null;
          audioContextRef.current = null;
          analyserRef.current = null;
        }
      };

      mediaRecorderRef.current.stop();
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      AudioUtils.cleanup(mediaRecorderRef.current, audioContextRef.current);
    };
  }, []);

  return {
    isRecording,
    isProcessing,
    audioLevel,
    startRecording,
    stopRecording,
    toggleRecording,
  };
};
