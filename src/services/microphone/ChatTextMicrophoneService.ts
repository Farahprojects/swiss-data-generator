/**
 * 💬 CHAT TEXT MICROPHONE SERVICE - Complete Domain Isolation
 * 
 * Handles ALL microphone functionality for chat text area voice input.
 * Completely isolated from other domains.
 */

import { supabase } from '@/integrations/supabase/client';
import { microphoneArbitrator } from './MicrophoneArbitrator';

export interface ChatTextMicrophoneOptions {
  onTranscriptReady?: (transcript: string) => void;
  onSilenceDetected?: () => void;
  silenceTimeoutMs?: number;
}

class ChatTextMicrophoneServiceClass {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  
  private audioChunks: Blob[] = []; // Simple chunk collection
  private isRecording = false;
  private isProcessing = false;
  private audioLevel = 0;
  private silenceTimer: NodeJS.Timeout | null = null;
  private monitoringRef = { current: false };
  private currentTraceId: string | null = null;
  private recordingStartedAt: number | null = null;
  
  private options: ChatTextMicrophoneOptions = {};
  private listeners = new Set<() => void>();

  /**
   * INITIALIZE - Set up service with options
   */
  initialize(options: ChatTextMicrophoneOptions): void {
    this.log('🔧 Initializing service with options', options);
    this.options = options;
  }

  /**
   * START RECORDING - Complete domain-specific recording
   */
  async startRecording(): Promise<boolean> {
    // Check permission from arbitrator
    if (!microphoneArbitrator.claim('chat-text')) {
      this.error('❌ Cannot start - microphone in use by another domain');
      return false;
    }

    try {
      this.currentTraceId = this.generateTraceId();
      this.recordingStartedAt = Date.now();
      this.log('🎤 Starting chat text voice recording');
      
      // Create our own stream - no sharing
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,           // Mono for efficiency
          echoCancellation: true,    // Clean input
          noiseSuppression: true,    // Remove background noise
          autoGainControl: true,     // Consistent levels
          sampleRate: 16000,         // Optimized for STT
        }
      });

      const trackSettings = this.stream.getAudioTracks()[0]?.getSettings?.() || {};
      this.log('🎛️ getUserMedia acquired. Track settings:', trackSettings);

      // Set up audio analysis
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.mediaStreamSource.connect(this.analyser);
      // reduced detailed analyser config logging

      // Set up MediaRecorder - simple and clean
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      this.audioChunks = [];
      this.isRecording = true;

      // Simple chunk collection - no manipulation
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        // Process clean audio before cleanup
        await this.processAudio();
        this.cleanup();
      };

      // Start recording - let MediaRecorder handle chunking naturally
      this.mediaRecorder.start();
      // minimal start log
      
      // Start two-phase Voice Activity Detection
      this.startVoiceActivityDetection();
      
      this.notifyListeners();
      this.log('✅ Recording started');
      return true;

    } catch (error) {
      this.error('❌ Failed to start recording:', error);
      microphoneArbitrator.release('chat-text');
      return false;
    }
  }

  /**
   * STOP RECORDING - Clean domain-specific stop
   */
  stopRecording(): void {
    if (!this.isRecording) return;

    this.log('🛑 Stopping recording');
    
    this.isRecording = false;
    this.monitoringRef.current = false;
    
    // Clear silence timer
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.log('⏹️ Calling mediaRecorder.stop()');
      this.mediaRecorder.stop();
    }
    // NOTE: cleanup will be triggered in the mediaRecorder.onstop handler
  }

  /**
   * TWO-PHASE VOICE ACTIVITY DETECTION - Professional VAD system
   */
  private startVoiceActivityDetection(): void {
    if (!this.analyser || this.monitoringRef.current) return;
    this.monitoringRef.current = true;

    const bufferLength = this.analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    
    // VAD State Machine
    let phase: 'waiting_for_voice' | 'monitoring_silence' = 'waiting_for_voice';
    let voiceStartTime: number | null = null;
    let silenceStartTime: number | null = null;
    
    // More sensitive thresholds for immediate voice detection
    const VOICE_START_THRESHOLD = 0.03;  // Lower threshold for faster detection
    const VOICE_START_DURATION = 150;    // Shorter duration to start recording faster
    const SILENCE_THRESHOLD = 0.015;     // Lower silence threshold
    const SILENCE_TIMEOUT = this.options.silenceTimeoutMs || 2000;
    
    this.log(`🧠 VAD started - waiting for voice (>${VOICE_START_THRESHOLD} RMS for ${VOICE_START_DURATION}ms)`);

    const checkVAD = () => {
      if (!this.monitoringRef.current || !this.analyser) return;
      
      // Get current RMS audio level
      this.analyser.getByteTimeDomainData(dataArray);
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        const centered = (dataArray[i] - 128) / 128;
        sumSquares += centered * centered;
      }
      const rms = Math.sqrt(sumSquares / bufferLength);
      this.audioLevel = rms;
      
      // Notify UI of audio level changes for waveform animation
      this.notifyListeners();
      
      const now = Date.now();
      
      if (phase === 'waiting_for_voice') {
        // Phase 1: Wait for real voice activity
        if (rms > VOICE_START_THRESHOLD) {
          if (voiceStartTime === null) {
            voiceStartTime = now;
          } else if (now - voiceStartTime >= VOICE_START_DURATION) {
            // Voice confirmed! Switch to silence monitoring
            phase = 'monitoring_silence';
            voiceStartTime = null;
            this.log(`🎤 Voice activity confirmed - now monitoring for ${SILENCE_TIMEOUT}ms silence`);
          }
        } else {
          voiceStartTime = null; // Reset if signal drops
        }
        
      } else if (phase === 'monitoring_silence') {
        // Phase 2: Monitor for silence after voice detected
        if (rms < SILENCE_THRESHOLD) {
          if (silenceStartTime === null) {
            silenceStartTime = now;
          } else if (now - silenceStartTime >= SILENCE_TIMEOUT) {
            // Natural silence detected - stop recording
            this.log(`🧘‍♂️ ${SILENCE_TIMEOUT}ms silence detected after voice - stopping naturally`);
            this.monitoringRef.current = false;
            
            if (this.options.onSilenceDetected) {
              this.options.onSilenceDetected();
            }
            
            this.stopRecording();
            return;
          }
        } else {
          silenceStartTime = null; // Reset silence timer - still speaking
        }
      }

      requestAnimationFrame(checkVAD);
    };

    checkVAD();
  }

  /**
   * PROCESS AUDIO - Domain-specific transcription
   */
  private async processAudio(): Promise<void> {
    if (this.audioChunks.length === 0) return;

    try {
      this.isProcessing = true;
      this.notifyListeners();
      
      // Simple, professional approach - let MediaRecorder handle the format
      const finalBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
      this.log('🔄 Processing clean audio', { finalBlobSize: finalBlob.size });
      // minimal
      
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];
          // minimal

          const { data, error } = await supabase.functions.invoke('google-speech-to-text', {
            body: {
              audioData: base64Audio,
              traceId: this.currentTraceId,
              config: {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 16000,
                languageCode: 'en-US',
                enableAutomaticPunctuation: true,
                model: 'latest_short'
              }
            }
          });

          if (error) throw error;
          
          const transcript = data?.transcript || '';
          this.log('📝 Transcript received', { length: transcript.length });
          
          if (this.options.onTranscriptReady && transcript) {
            this.options.onTranscriptReady(transcript);
          }
          
        } catch (error) {
          this.error('❌ Transcription failed:', error);
        } finally {
          this.isProcessing = false;
          this.notifyListeners();
        }
      };
      
      reader.readAsDataURL(finalBlob);
      
    } catch (error) {
      this.error('❌ Audio processing failed:', error);
      this.isProcessing = false;
      this.notifyListeners();
    }
  }

  /**
   * CLEANUP - Complete domain cleanup
   */
  private cleanup(): void {
    this.log('🧹 Cleaning up chat text microphone');

    // Disconnect audio nodes
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    // Close AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Stop stream tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Clear refs
    this.mediaRecorder = null;
    this.analyser = null;
    this.audioLevel = 0;
    this.currentTraceId = null;
    this.recordingStartedAt = null;

    // Release arbitrator
    microphoneArbitrator.release('chat-text');
    
    this.notifyListeners();
  }

  /**
   * GET STATE - For React hooks
   */
  getState() {
    return {
      isRecording: this.isRecording,
      isProcessing: this.isProcessing,
      audioLevel: this.audioLevel
    };
  }

  /**
   * SUBSCRIBE - For React state updates
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * TOGGLE RECORDING - Convenience method for UI
   */
  async toggleRecording(): Promise<void> {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  /**
   * FORCE CLEANUP - Emergency cleanup
   */
  forceCleanup(): void {
    this.log('🚨 Force cleanup');
    this.isRecording = false;
    this.isProcessing = false;
    this.monitoringRef.current = false;
    this.cleanup();
  }

  // ---------- Logging helpers ----------
  private generateTraceId(): string {
    try {
      // @ts-ignore - crypto is available in browsers
      if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
        return (crypto as any).randomUUID();
      }
    } catch {}
    return 'mic-' + Math.random().toString(36).slice(2);
  }

  private prefix(): string {
    return this.currentTraceId ? `[trace:${this.currentTraceId}]` : '';
  }

  private log(message: string, ...args: any[]): void {
    // Gate non-error logs behind a runtime flag to keep console clean by default.
    // Enable by running in DevTools: localStorage.setItem('debugAudio', '1')
    try {
      if (typeof localStorage !== 'undefined') {
        const enabled = localStorage.getItem('debugAudio') === '1';
        if (!enabled) return;
      }
    } catch {}
    // eslint-disable-next-line no-console
    console.log('[ChatTextMic]', this.prefix(), message, ...args);
  }

  private error(message: string, ...args: any[]): void {
    // eslint-disable-next-line no-console
    console.error('[ChatTextMic]', this.prefix(), message, ...args);
  }

  getTraceId(): string | null {
    return this.currentTraceId;
  }
}

// Singleton instance for chat-text domain
export const chatTextMicrophoneService = new ChatTextMicrophoneServiceClass();
