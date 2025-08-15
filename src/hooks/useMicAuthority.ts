import { useState, useCallback, useRef } from 'react';
import { log } from '@/utils/logUtils';
import { supabase } from '@/integrations/supabase/client';

/**
 * CENTRALIZED MIC AUTHORITY - Single Source of Truth
 * 
 * This hook is the ONLY authority on microphone state.
 * All other components (FSM, recording, audio) are downstream consumers.
 * 
 * Principle: If micIsOn = false, EVERYTHING stops. No exceptions.
 */
export const useMicAuthority = (onTranscriptReady?: (transcript: string) => void) => {
  const [micIsOn, setMicIsOn] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Internal refs for cleanup
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const monitoringRef = useRef(false);
  const lastSpeechTimeRef = useRef<number>(0);

  /**
   * AUTHORITY DECISION: Turn mic ON
   * This starts everything downstream
   */
  const engageMic = useCallback(async (): Promise<boolean> => {
    if (micIsOn) {
      log('debug', '[MicAuthority] Mic already engaged');
      return true;
    }

    try {
      log('debug', '[MicAuthority] 🎤 ENGAGING MIC - Starting all systems');
      
      // 1. Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        } 
      });

      // 2. Set up audio context and monitoring
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;
      mediaStreamSourceRef.current.connect(analyserRef.current);

      // 3. Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      // Set up data collection
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // 4. Start monitoring and recording
      audioChunksRef.current = [];
      monitoringRef.current = true;
      startAudioLevelMonitoring();
      
      mediaRecorderRef.current.start();

      // 5. MIC IS NOW ON - this triggers all downstream reactions
      setMicIsOn(true);
      
      log('debug', '[MicAuthority] ✅ MIC ENGAGED - All systems active');
      return true;

    } catch (error) {
      log('error', '[MicAuthority] Failed to engage mic:', error);
      return false;
    }
  }, [micIsOn]);

  /**
   * AUTHORITY DECISION: Turn mic OFF
   * This stops everything downstream immediately
   */
  const disengageMic = useCallback(async (): Promise<string> => {
    if (!micIsOn) {
      log('debug', '[MicAuthority] Mic already disengaged');
      return '';
    }

    log('debug', '[MicAuthority] 🚨 DISENGAGING MIC - Emergency shutdown of all systems');
    
    // 1. AUTHORITY DECISION: MIC IS OFF (triggers all downstream cleanup)
    setMicIsOn(false);
    setAudioLevel(0);
    
    // 2. Stop monitoring immediately
    monitoringRef.current = false;
    
    // 3. Clear timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // 4. Disconnect audio nodes FIRST
    if (mediaStreamSourceRef.current) {
      try {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
      } catch (e) {
        console.warn('[MicAuthority] AudioNode disconnect failed:', e);
      }
    }

    // 5. Stop MediaStream tracks IMMEDIATELY
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          track.stop();
          log('debug', `[MicAuthority] Stopped ${track.kind} track`);
        }
      });
    }

    // 6. Process any recorded audio before cleanup
    let transcript = '';
    if (mediaRecorderRef.current && audioChunksRef.current.length > 0) {
      try {
        // Set up one-time processing
        const processAudio = () => {
          return new Promise<string>(async (resolve) => {
            if (audioChunksRef.current.length === 0) {
              resolve('');
              return;
            }
            
            try {
              setIsProcessing(true);
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
              
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
                      }
                    }
                  });

                  if (error) {
                    log('error', '[MicAuthority] Speech-to-text error:', error);
                    resolve('');
                    return;
                  }

                  const transcript = data?.transcript || '';
                  log('debug', '[MicAuthority] Transcript received:', transcript);
                  
                  // Notify callback
                  if (onTranscriptReady && transcript) {
                    onTranscriptReady(transcript);
                  }
                  
                  resolve(transcript);
                } catch (e) {
                  log('error', '[MicAuthority] Transcription failed:', e);
                  resolve('');
                } finally {
                  setIsProcessing(false);
                }
              };
              
              reader.readAsDataURL(audioBlob);
            } catch (e) {
              log('error', '[MicAuthority] Audio processing failed:', e);
              setIsProcessing(false);
              resolve('');
            }
          });
        };

        mediaRecorderRef.current.onstop = async () => {
          try {
            transcript = await processAudio();
          } catch (e) {
            console.warn('[MicAuthority] Audio processing failed:', e);
          } finally {
            cleanupRecorder();
          }
        };

        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('[MicAuthority] MediaRecorder stop failed:', e);
        cleanupRecorder();
      }
    } else {
      cleanupRecorder();
    }

    // 7. Close AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        await audioContextRef.current.close();
        audioContextRef.current = null;
        analyserRef.current = null;
      } catch (e) {
        console.warn('[MicAuthority] AudioContext close failed:', e);
      }
    }

    log('debug', '[MicAuthority] ✅ MIC DISENGAGED - All systems stopped');
    return transcript;
  }, [micIsOn]);

  /**
   * Clean up recorder references
   */
  const cleanupRecorder = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
  }, []);

  /**
   * Audio level monitoring with silence detection
   */
  const startAudioLevelMonitoring = useCallback(() => {
    if (!analyserRef.current || !monitoringRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    const SPEECH_THRESHOLD = 30; // Adjust as needed
    const SILENCE_DURATION = 2000; // 2 seconds of silence
    
    const monitor = () => {
      if (!monitoringRef.current || !analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setAudioLevel(average);
      
      const now = Date.now();
      
      if (average > SPEECH_THRESHOLD) {
        // Speech detected - reset silence timer
        lastSpeechTimeRef.current = now;
        
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else {
        // Silence detected - start timer if not already running
        if (!silenceTimerRef.current && lastSpeechTimeRef.current > 0) {
          const silenceDuration = now - lastSpeechTimeRef.current;
          
          if (silenceDuration >= SILENCE_DURATION) {
            // Immediate silence timeout
            log('debug', '[MicAuthority] Silence detected - stopping recording');
            disengageMic(); // This will process the audio
          } else {
            // Set timer for remaining silence duration
            const remainingTime = SILENCE_DURATION - silenceDuration;
            silenceTimerRef.current = setTimeout(() => {
              if (monitoringRef.current) {
                log('debug', '[MicAuthority] Silence timeout - stopping recording');
                disengageMic();
              }
            }, remainingTime);
          }
        }
      }
      
      requestAnimationFrame(monitor);
    };
    
    lastSpeechTimeRef.current = Date.now(); // Initialize speech time
    monitor();
  }, [disengageMic]);

  /**
   * EMERGENCY SHUTDOWN - For crashes/timeouts only
   */
  const emergencyShutdown = useCallback(() => {
    log('error', '[MicAuthority] 🚨 EMERGENCY SHUTDOWN - Force killing everything');
    
    try {
      // Force all states to off
      setMicIsOn(false);
      setAudioLevel(0);
      setIsProcessing(false);
      monitoringRef.current = false;
      
      // Force stop tracks
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
      }
      
      // Force disconnect nodes
      if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
      }
      
      // Clear all refs
      cleanupRecorder();
      
      if (audioContextRef.current) {
        audioContextRef.current.close(); // Don't await in emergency
        audioContextRef.current = null;
        analyserRef.current = null;
      }
      
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      log('debug', '[MicAuthority] ✅ Emergency shutdown complete');
    } catch (e) {
      console.error('[MicAuthority] Emergency shutdown failed:', e);
    }
  }, [cleanupRecorder]);

  return {
    // AUTHORITY STATE (single source of truth)
    micIsOn,
    audioLevel,
    isProcessing,
    
    // AUTHORITY DECISIONS (only these control the mic)
    engageMic,
    disengageMic,
    emergencyShutdown,
  };
};
