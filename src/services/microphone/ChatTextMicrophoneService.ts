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
      
      // Create our own stream with universal constraints
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Universal: Clean, simple settings (works for all browsers)
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

      // Set up audio analysis - universal approach
      // Reuse existing AudioContext if available, only create new one if needed
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioContext(); // Universal: Let browser choose optimal settings
        this.log('🎛️ Created new AudioContext for chat text microphone');
      } else {
        this.log('🎛️ Reusing existing AudioContext for chat text microphone');
      }
      
      // Note: New VAD system handles its own audio analysis internally

      // Initialize rolling buffer VAD with team's approach
      this.rollingBufferVAD = new RollingBufferVAD({
        lookbackWindowMs: 15000,
        chunkDurationMs: 200,
        preRollMs: 250,
        postRollMs: 150,
        pruneOnUtterance: true,
        voiceThreshold: 0.012,
        silenceThreshold: 0.008,
        voiceConfirmMs: 300,
        silenceTimeoutMs: this.options.silenceTimeoutMs || 1500,
        maxUtteranceMs: 15000,
        minUtteranceMs: 250,
        onVoiceStart: () => {
          this.log('🎤 Rolling buffer VAD: Voice activity confirmed');
        },
        onUtterance: async (blob: Blob) => {
          this.log('🎤 Rolling buffer VAD: Utterance detected - processing speech', { blobSize: blob.size, blobType: blob.type });
          await this.processAudioBlob(blob);
        },
        onSilenceDetected: async (blob?: Blob) => {
          this.log('🔇 Rolling buffer VAD: Silence detected', { hasBlob: !!blob, blobSize: blob?.size, blobType: blob?.type });
          // Back-compat: also handle onSilenceDetected
          if (blob) {
            this.log('🔇 Rolling buffer VAD: Processing speech from silence detection');
            await this.processAudioBlob(blob);
          }
          if (this.options.onSilenceDetected) {
            this.options.onSilenceDetected();
          }
        },
        onError: (error: Error) => {
          this.error('❌ Rolling buffer VAD error:', error);
        }
      });

      this.isRecording = true;

      // Start rolling buffer VAD (new interface - no need to pass analyser)
      this.log('🚀 Starting rolling buffer VAD...');
      await this.rollingBufferVAD.start(this.stream, this.audioContext);
      this.log('✅ Rolling buffer VAD started successfully');
      
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
    
    // Note: New VAD system handles its own audio analysis cleanup
    
    // Keep AudioContext and stream alive for next speech
    // Only call full cleanup() when the service is completely done
    
    return finalBlob;
  }

  /**
   * PROCESS AUDIO BLOB - Handle audio blob from new VAD system
   */
  private async processAudioBlob(audioBlob: Blob): Promise<void> {
    if (this.isProcessing) {
      this.log('⚠️ Already processing audio, skipping');
      return;
    }

    this.log(`🎵 PROCESSING AUDIO BLOB: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
    await this.processAudio(audioBlob);
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
      const { data, error } = await supabase.functions.invoke('openai-whisper', {
        body: audioBlob,
        headers: {
          'X-Trace-Id': this.currentTraceId || '',
          'X-Meta': JSON.stringify({
            measuredDurationMs,
            blobSize: audioBlob.size,
            config: {
              mimeType: 'audio/webm',
              languageCode: 'en'
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

    // Note: New VAD system handles its own audio analysis cleanup

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
   * GET ANALYSER - Note: New VAD system handles its own audio analysis
   */
  getAnalyser(): AnalyserNode | null {
    // New VAD system handles its own audio analysis internally
    return null;
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