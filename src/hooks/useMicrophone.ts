import { useState, useRef, useCallback, useEffect } from 'react';
import { MicManager } from '@/services/MicManager';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseMicrophoneOptions {
  ownerId: string;
  onTranscriptReady?: (transcript: string) => void;
  onSilenceDetected?: () => void;
  silenceTimeoutMs?: number;
  useSharedStream?: boolean;
}

/**
 * 🎤 PROFESSIONAL MICROPHONE HOOK
 * 
 * Each feature gets its own microphone instance.
 * Handles its own lifecycle, state, and cleanup.
 * Requests permission from MicManager (the bouncer).
 */
export const useMicrophone = ({
  ownerId,
  onTranscriptReady,
  onSilenceDetected,
  silenceTimeoutMs = 3000,
  useSharedStream = false
}: UseMicrophoneOptions) => {
  
  // LOCAL STATE - Each feature manages its own
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // REFS - For cleanup and monitoring
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const monitoringRef = useRef(false);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const { toast } = useToast();

  // CLEANUP FUNCTION - Called on unmount or stop
  const cleanup = useCallback(() => {
    console.log(`[useMicrophone:${ownerId}] 🧹 Cleanup starting`);
    
    // Stop monitoring
    monitoringRef.current = false;
    
    // Clear timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    // Disconnect audio nodes
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    
    // Close AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Stop stream tracks (only if we own the stream)
    if (streamRef.current && !useSharedStream) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    streamRef.current = null;
    
    // Release mic access
    MicManager.releaseAccess(ownerId);
    
    // Reset state
    setIsRecording(false);
    setIsProcessing(false);
    setAudioLevel(0);
    
    console.log(`[useMicrophone:${ownerId}] ✅ Cleanup complete`);
  }, [ownerId, useSharedStream]);

  // SILENCE MONITORING
  const monitorSilence = useCallback(() => {
    if (!analyserRef.current || monitoringRef.current) return;
    
    monitoringRef.current = true;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let silenceStart: number | null = null;
    
    const checkSilence = () => {
      if (!monitoringRef.current || !analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate RMS (audio level)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      setAudioLevel(rms);
      
      const silenceThreshold = 8;
      const now = Date.now();
      
      if (rms < silenceThreshold) {
        if (silenceStart === null) {
          silenceStart = now;
          console.log(`[useMicrophone:${ownerId}] 🤫 Silence started`);
        } else if (now - silenceStart >= silenceTimeoutMs) {
          console.log(`[useMicrophone:${ownerId}] ⏰ Silence timeout - stopping recording`);
          monitoringRef.current = false;
          
          // Trigger callbacks
          if (onSilenceDetected) onSilenceDetected();
          
          // Stop recording
          stopRecording();
          return;
        }
      } else {
        if (silenceStart !== null) {
          console.log(`[useMicrophone:${ownerId}] 🔊 Sound detected - resetting silence timer`);
          silenceStart = null;
        }
      }
      
      // Continue monitoring
      requestAnimationFrame(checkSilence);
    };
    
    checkSilence();
  }, [ownerId, silenceTimeoutMs, onSilenceDetected]);

  // PROCESS AUDIO - Convert to text
  const processAudio = useCallback(async (): Promise<string> => {
    if (audioChunksRef.current.length === 0) {
      console.log(`[useMicrophone:${ownerId}] No audio to process`);
      return '';
    }

    try {
      setIsProcessing(true);
      console.log(`[useMicrophone:${ownerId}] 🔄 Processing audio...`);
      
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
      
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
                  model: 'latest_long'
                }
              }
            });

            if (error) throw error;
            
            const transcript = data?.transcript || '';
            console.log(`[useMicrophone:${ownerId}] 📝 Transcript:`, transcript);
            
            if (onTranscriptReady && transcript) {
              onTranscriptReady(transcript);
            }
            
            resolve(transcript);
          } catch (error) {
            console.error(`[useMicrophone:${ownerId}] ❌ Processing error:`, error);
            reject(error);
          } finally {
            setIsProcessing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      });
    } catch (error) {
      console.error(`[useMicrophone:${ownerId}] ❌ Audio processing failed:`, error);
      setIsProcessing(false);
      throw error;
    }
  }, [ownerId, onTranscriptReady]);

  // START RECORDING
  const startRecording = useCallback(async (): Promise<boolean> => {
    // Check if we can use the mic
    if (!MicManager.requestAccess(ownerId)) {
      toast({
        title: "Microphone busy",
        description: "Another feature is currently using the microphone",
        variant: "destructive",
      });
      return false;
    }

    try {
      console.log(`[useMicrophone:${ownerId}] 🎤 Starting recording`);
      
      // Get stream (shared or individual)
      const stream = useSharedStream 
        ? await MicManager.getSharedStream()
        : await navigator.mediaDevices.getUserMedia({ audio: true });
        
      if (!stream) {
        throw new Error('Failed to get microphone stream');
      }
      
      streamRef.current = stream;
      
      // Set up audio analysis
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;
      mediaStreamSourceRef.current.connect(analyserRef.current);
      
      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log(`[useMicrophone:${ownerId}] 📼 Recording stopped - processing audio`);
        processAudio();
      };
      
      mediaRecorder.start(100);
      setIsRecording(true);
      
      // Start silence monitoring
      setTimeout(() => monitorSilence(), 100);
      
      toast({
        title: "Recording started",
        description: `Listening for your input... (${ownerId})`,
      });
      
      return true;
      
    } catch (error) {
      console.error(`[useMicrophone:${ownerId}] ❌ Start recording failed:`, error);
      MicManager.releaseAccess(ownerId);
      toast({
        title: "Recording failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
      return false;
    }
  }, [ownerId, useSharedStream, toast, monitorSilence, processAudio]);

  // STOP RECORDING
  const stopRecording = useCallback(() => {
    console.log(`[useMicrophone:${ownerId}] 🛑 Stopping recording`);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    cleanup();
  }, [ownerId, cleanup]);

  // TOGGLE RECORDING
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // AUTO-CLEANUP ON UNMOUNT
  useEffect(() => {
    return () => {
      console.log(`[useMicrophone:${ownerId}] 🔄 Component unmounting - cleaning up`);
      cleanup();
    };
  }, [ownerId, cleanup]);

  return {
    // State
    isRecording,
    isProcessing,
    audioLevel,
    
    // Actions
    startRecording,
    stopRecording,
    toggleRecording,
    
    // Manual cleanup (if needed)
    cleanup
  };
};
