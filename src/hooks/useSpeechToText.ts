
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { log } from '@/utils/logUtils';

export const useSpeechToText = (
  onTranscriptReady?: (transcript: string) => void,
  onSilenceDetected?: () => void,
  onSilenceTimeout?: () => void // New callback for 3-second silence timeout
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const isRecordingRef = useRef(false);
  const monitoringRef = useRef(false);
  const externalStreamRef = useRef(false); // Track if using external stream
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
          log('debug', '3 seconds of silence detected, notifying MIC BOSS to turn off');
          monitoringRef.current = false;
          
          // Trigger silence detected callback immediately
          if (onSilenceDetected) {
            onSilenceDetected();
          }
          
          // Notify MIC BOSS to turn off mic (external control)
          if (onSilenceTimeout) {
            onSilenceTimeout();
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

  const startRecording = useCallback(async (externalStream?: MediaStream) => {
    try {
      // Skip in SSR environment
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        throw new Error('Speech recognition not available in this environment');
      }
      
      log('debug', 'Starting recording');
      
      let stream: MediaStream;
      
      if (externalStream && externalStream.active) {
        console.log('[useSpeechToText] Using external stream:', externalStream.id);
        stream = externalStream;
      } else {
        console.error('[useSpeechToText] ❌ NO EXTERNAL STREAM PROVIDED!');
        console.error('useSpeechToText must receive stream from MIC BOSS');
        console.error('Cannot create own stream - this bypasses centralized mic control');
        throw new Error('useSpeechToText requires external stream from Mic Boss');
      }
      
      // Set up audio context for silence detection
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;
      mediaStreamSourceRef.current.connect(analyserRef.current);
      
      // Enhanced MediaRecorder options
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      isRecordingRef.current = true;
      externalStreamRef.current = !!externalStream;

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

      log('debug', 'Stopping recording with proper shutdown sequence');
      
      // 1. Set flags immediately
      isRecordingRef.current = false;
      monitoringRef.current = false;
      setIsRecording(false);
      setAudioLevel(0);

      // 2. Clear silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      // 3. Disconnect audio nodes FIRST (critical for releasing mic)
      if (mediaStreamSourceRef.current) {
        try {
          log('debug', 'Disconnecting MediaStreamSource');
          mediaStreamSourceRef.current.disconnect();
          mediaStreamSourceRef.current = null;
        } catch (e) {
          console.warn('AudioNode disconnect failed:', e);
        }
      }

      // 4. Only stop tracks if we created the stream ourselves
      // If using external stream, let the external manager handle cleanup
      if (mediaRecorderRef.current?.stream && !externalStreamRef.current) {
        log('debug', 'Stopping MediaStream tracks (internal stream)');
        mediaRecorderRef.current.stream.getTracks().forEach(track => {
          try {
            if (track.readyState === 'live') {
              log('debug', `Stopping ${track.kind} track`);
              track.stop();
            }
          } catch (e) {
            console.warn('Track stop error:', e);
          }
        });
      } else if (externalStreamRef.current) {
        log('debug', 'Using external stream - skipping track cleanup');
      }

      // 5. Set up onstop handler for async processing
      mediaRecorderRef.current.onstop = async () => {
        try {
          log('debug', 'Recording stopped, processing audio');
          const transcript = await processAudio();
          resolve(transcript);
        } catch (error) {
          log('error', 'Error in onstop handler', error);
          reject(error);
        } finally {
          // 6. Clean up event listeners
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.ondataavailable = null;
          }
        }
      };

      // 7. Stop the MediaRecorder (safe even though tracks are stopped)
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('MediaRecorder stop error:', e);
        resolve(''); // Still resolve to prevent hanging
      }

      // 8. Close AudioContext last (after everything else is cleaned up)
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          log('debug', 'Closing AudioContext');
          await audioContextRef.current.close();
          audioContextRef.current = null;
          analyserRef.current = null;
        } catch (e) {
          console.warn('AudioContext close error:', e);
        }
      }
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

  // EMERGENCY ONLY: For timeouts, crashes, or unrecoverable errors
  const forceCleanup = useCallback(() => {
    console.log('[useSpeechToText] 🚨 EMERGENCY FORCE CLEANUP - last resort only');
    
    try {
      // Disconnect audio nodes
      if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
      }
      
      // Stop tracks immediately
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
      }
      
      // Reset all refs and state
      isRecordingRef.current = false;
      monitoringRef.current = false;
      externalStreamRef.current = false;
      setIsRecording(false);
      setIsProcessing(false);
      setAudioLevel(0);
      
      // Clear timers
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      // Clean up event listeners
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.ondataavailable = null;
      }
      
      // Close audio context synchronously (don't await)
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close(); // Don't await in emergency
        audioContextRef.current = null;
        analyserRef.current = null;
      }
      
      console.log('[useSpeechToText] ✅ Emergency cleanup complete');
    } catch (e) {
      console.error('[useSpeechToText] ❌ Emergency cleanup failed:', e);
    }
  }, []);

  return {
    isRecording,
    isProcessing,
    audioLevel,
    startRecording,
    stopRecording,
    toggleRecording,
    forceCleanup, // Safe emergency cleanup
  };
};
