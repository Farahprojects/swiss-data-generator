/**
 * 💬 CHAT TEXT MICROPHONE SERVICE - Complete Domain Isolation
 * 
 * Handles ALL microphone functionality for chat text area voice input.
 * Completely isolated from other domains. Now uses shared RollingBufferVAD.
 */

import { supabase } from '@/integrations/supabase/client';
import { microphoneArbitrator } from './MicrophoneArbitrator';
import { RollingBufferVAD } from './vad/RollingBufferVAD';

export interface ChatTextMicrophoneOptions {
  onTranscriptReady?: (transcript: string) => void;
  onSilenceDetected?: () => void;
  silenceTimeoutMs?: number;
}

class ChatTextMicrophoneServiceClass {
  private stream: MediaStream | null = null;
  private rollingBufferVAD: RollingBufferVAD | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  
  private isRecording = false;
  private isProcessing = false;
  private audioLevel = 0;
  private recordingTimeout: NodeJS.Timeout | null = null;
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
   * START RECORDING - Complete domain-specific recording with rolling buffer VAD
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
      
      // Create our own stream with mobile-friendly constraints
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Mobile-friendly: Let browser choose optimal settings
          echoCancellation: true,    // Clean input
          noiseSuppression: true,    // Remove background noise
          autoGainControl: true      // Consistent levels
        }
      });

      const trackSettings = this.stream.getAudioTracks()[0]?.getSettings?.() || {};
      this.log('🎛️ getUserMedia acquired. Track settings:', trackSettings);
      
      // Log actual settings for debugging
      this.log(`🎛️ Actual sample rate: ${trackSettings.sampleRate || 'unknown'}`);
      this.log(`🎛️ Actual channel count: ${trackSettings.channelCount || 'unknown'}`);

      // Set up audio analysis - mobile optimized
      // Reuse existing AudioContext if available, only create new one if needed
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioContext(); // Mobile-friendly: Let browser choose sample rate
        this.log('🎛️ Created new AudioContext for chat text microphone');
      } else {
        this.log('🎛️ Reusing existing AudioContext for chat text microphone');
      }
      
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024; // Mobile-first: Smaller FFT for faster analysis
      this.analyser.smoothingTimeConstant = 0.8;
      this.mediaStreamSource.connect(this.analyser);

      // Initialize rolling buffer VAD
      this.rollingBufferVAD = new RollingBufferVAD({
        lookbackWindowMs: 750,
        chunkDurationMs: 250,
        voiceThreshold: 0.012,
        silenceThreshold: 0.008,
        voiceConfirmMs: 300,
        silenceTimeoutMs: this.options.silenceTimeoutMs || 1500,
        onVoiceStart: () => {
          this.log('🎤 Rolling buffer VAD: Voice activity confirmed');
        },
        onSilenceDetected: async () => {
          this.log('🧘‍♂️ Rolling buffer VAD: Silence detected - stopping recording');
          if (this.options.onSilenceDetected) {
            this.options.onSilenceDetected();
          }
          const audioBlob = await this.stopRecording();
          if (audioBlob) {
            await this.processAudio(audioBlob);
          }
        },
        onError: (error: Error) => {
          this.error('❌ Rolling buffer VAD error:', error);
        }
      });

      this.isRecording = true;

      // Start rolling buffer VAD
      await this.rollingBufferVAD.start(this.stream, this.audioContext, this.analyser);
      
      // Set 45-second timeout to automatically stop recording
      this.recordingTimeout = setTimeout(async () => {
        this.log('⏰ 45-second recording timeout reached - stopping automatically');
        const audioBlob = await this.stopRecording();
        if (audioBlob) {
          await this.processAudio(audioBlob);
        }
      }, 45000);
      
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
  async stopRecording(): Promise<Blob | null> {
    if (!this.isRecording) return;

    this.log('🛑 Stopping recording');
    
    this.isRecording = false;

    // 🔧 Ensure VAD monitoring stops immediately
    if (this.rollingBufferVAD) {
      // stop() will resolve with final blob and stop MediaRecorder
      // cleanup() later resets internal state
    }

    // Clear recording timeout
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }

    // Stop rolling buffer VAD and get final blob
    let finalBlob: Blob | null = null;
    if (this.rollingBufferVAD) {
      finalBlob = await this.rollingBufferVAD.stop();
    }

    // Notify listeners after isRecording becomes false
    this.notifyListeners();

    // ✅ VAD is now self-cleaning - MediaRecorder auto-cleaned after STT
    if (this.rollingBufferVAD) {
      this.rollingBufferVAD = null;
    }
    
    // Disconnect analysis nodes but keep AudioContext alive
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }
    
    // Keep AudioContext and stream alive for next speech
    // Only call full cleanup() when the service is completely done
    
    return finalBlob;
  }

  /**
   * PROCESS AUDIO - Domain-specific transcription with rolling buffer
   */
  private async processAudio(audioBlob: Blob): Promise<void> {
    try {
      this.isProcessing = true;
      this.notifyListeners();
      
      const measuredDurationMs = this.recordingStartedAt ? Date.now() - this.recordingStartedAt : 0;

      this.log('🔄 Processing audio with VAD lookback', { 
        finalBlobSize: audioBlob.size,
        measuredDurationMs
      });
      
      // Use supabase.functions.invoke for transcription
      const { data, error } = await supabase.functions.invoke('google-speech-to-text', {
        body: audioBlob,
        headers: {
          'X-Trace-Id': this.currentTraceId || '',
          'X-Meta': JSON.stringify({
            measuredDurationMs,
            blobSize: audioBlob.size,
            config: {
              encoding: 'WEBM_OPUS',
              languageCode: 'en-US',
              enableAutomaticPunctuation: true,
              model: 'latest_long'
            }
          })
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
  }

  /**
   * CLEANUP - Complete domain cleanup
   */
  private cleanup(): void {
    this.log('🧹 Cleaning up chat text microphone');

    // VAD is self-cleaning - no need to call cleanup() here
    // The VAD.stop() method already calls cleanup() internally
    if (this.rollingBufferVAD) {
      this.rollingBufferVAD = null;
    }

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
    this.analyser = null;
    this.audioLevel = 0;
    this.currentTraceId = null;
    this.recordingStartedAt = null;

    // Clear any remaining timers
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
      this.recordingTimeout = null;
    }

    // Release arbitrator
    microphoneArbitrator.release('chat-text');
    
    this.notifyListeners();
  }

  /**
   * GET STATE - For React hooks
   */
  getState() {
    // Get audio level from rolling buffer VAD if available
    if (this.rollingBufferVAD) {
      const vadState = this.rollingBufferVAD.getState();
      this.audioLevel = vadState.audioLevel;
    }
    
    return {
      isRecording: this.isRecording,
      isProcessing: this.isProcessing,
      audioLevel: this.audioLevel
    };
  }

  /**
   * GET STREAM - Return current MediaStream for real-time audio analysis
   */
  getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * GET ANALYSER - Return current AnalyserNode for read-only realtime analysis
   */
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
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
      await this.stopRecording();
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
    this.cleanup();
  }

  // ---------- Logging helpers ----------
  private generateTraceId(): string {
    try {
      if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
      }
    } catch {}
    return 'mic-' + Math.random().toString(36).slice(2);
  }

  private prefix(): string {
    return this.currentTraceId ? `[trace:${this.currentTraceId}]` : '';
  }

  private log(message: string, ...args: any[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const enabled = localStorage.getItem('debugAudio') === '1';
        if (!enabled) return;
      }
    } catch {}
    console.log('[ChatTextMic]', this.prefix(), message, ...args);
  }

  private error(message: string, ...args: any[]): void {
    console.error('[ChatTextMic]', this.prefix(), message, ...args);
  }

  getTraceId(): string | null {
    return this.currentTraceId;
  }
}

// Singleton instance for chat-text domain
export const chatTextMicrophoneService = new ChatTextMicrophoneServiceClass();