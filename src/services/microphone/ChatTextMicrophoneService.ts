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
  onDebugAudioSave?: (audioBlob: Blob, reason: string) => void;
  silenceTimeoutMs?: number;
}

interface AudioChunk {
  blob: Blob;
  timestamp: number;
}

class ChatTextMicrophoneServiceClass {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  
  private circularBuffer: AudioChunk[] = []; // Circular buffer for retroactive trimming
  private bufferMaxDuration = 2000; // 2 seconds buffer
  private voiceConfirmedAt: number | null = null; // Timestamp when voice was confirmed
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
          // By setting these to false, we ask the browser for a less processed, more raw audio stream.
          // This can often improve quality on good hardware by avoiding overly aggressive browser algorithms.
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000, // Keep high sample rate
          channelCount: 1     // Keep mono
        }
      });

      const trackSettings = this.stream.getAudioTracks()[0]?.getSettings?.() || {};
      this.log('🎛️ getUserMedia acquired. Track settings:', trackSettings);

      // Set up audio analysis
      this.audioContext = new AudioContext({ sampleRate: 48000 });
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.mediaStreamSource.connect(this.analyser);
      // reduced detailed analyser config logging

      // Set up MediaRecorder with circular buffering
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      this.circularBuffer = [];
      this.voiceConfirmedAt = null;
      this.recordingStartedAt = Date.now();
      this.isRecording = true;

      // Circular buffer with 100ms chunks for precise trimming
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          const chunk: AudioChunk = {
            blob: event.data,
            timestamp: Date.now()
          };
          
          // Add to circular buffer
          this.circularBuffer.push(chunk);
          
          // Trim buffer to max duration (2s rolling window)
          const cutoffTime = chunk.timestamp - this.bufferMaxDuration;
          this.circularBuffer = this.circularBuffer.filter(c => c.timestamp > cutoffTime);
        }
      };

      this.mediaRecorder.onstop = async () => {
        // Process with retroactive trimming before cleanup
        await this.processAudio();
        this.cleanup();
      };

      this.mediaRecorder.start(100);
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
    
    // Tuned thresholds for real-world speech levels (Level 20-40 normal speech)
    const VOICE_START_THRESHOLD = 0.02;  // Level ~20 - matches actual normal speech
    const VOICE_START_DURATION = 250;    // 250ms sustained voice to confirm
    const SILENCE_THRESHOLD = 0.01;      // Level ~10 - below normal speech
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
      
      const now = Date.now();
      
      if (phase === 'waiting_for_voice') {
        // Phase 1: Wait for real voice activity
        if (rms > VOICE_START_THRESHOLD) {
          if (voiceStartTime === null) {
            voiceStartTime = now;
          } else if (now - voiceStartTime >= VOICE_START_DURATION) {
            // Voice confirmed! Mark timestamp and switch to silence monitoring
            this.voiceConfirmedAt = voiceStartTime; // Mark when voice actually started
            phase = 'monitoring_silence';
            voiceStartTime = null;
            this.log(`🎤 Voice activity confirmed at ${this.voiceConfirmedAt} - now monitoring for ${SILENCE_TIMEOUT}ms silence`);
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
   * SAVE DEBUG AUDIO - Upload failed audio to ChatAudio bucket for analysis
   */
  private async saveDebugAudio(audioBlob: Blob, metadata: {
    service: string;
    voiceDetected: boolean;
    bufferChunks: number;
    finalBlobSize: number;
    reason: string;
  }): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `debug-chat-text-${timestamp}.webm`;
      
      this.log(`🔍 Saving debug audio: ${filename} (${audioBlob.size} bytes)`);
      
      const { error } = await supabase.storage
        .from('ChatAudio')
        .upload(filename, audioBlob, {
          contentType: 'audio/webm',
          metadata: {
            ...metadata,
            timestamp,
            debugType: 'chat-text-failure'
          }
        });

      if (error) {
        this.error('❌ Failed to save debug audio:', error);
      } else {
        this.log(`✅ Debug audio saved: ${filename}`);
        console.log(`🔍 Debug audio metadata:`, metadata);
      }
    } catch (error) {
      this.error('❌ Error saving debug audio:', error);
    }
  }

  /**
   * PROCESS AUDIO - Domain-specific transcription
   */
  private async processAudio(): Promise<void> {
    if (this.circularBuffer.length === 0) return;

    try {
      this.isProcessing = true;
      this.notifyListeners();
      
      // Retroactive trimming based on voice confirmation
      let finalBlob: Blob;
      
      if (this.voiceConfirmedAt && this.circularBuffer.length > 0) {
        // Trim buffer to include only audio from voice confirmation onwards
        const voiceChunks = this.circularBuffer.filter(chunk => 
          chunk.timestamp >= this.voiceConfirmedAt!
        );
        
        this.log(`🎯 Voice-trimmed audio: ${voiceChunks.length}/${this.circularBuffer.length} chunks kept`);
        finalBlob = new Blob(voiceChunks.map(c => c.blob), { type: 'audio/webm;codecs=opus' });
      } else {
        // No voice detected - return minimal buffer to avoid empty transcription
        this.log('⚠️ No voice confirmation - using last few chunks');
        finalBlob = new Blob(this.circularBuffer.slice(-3).map(c => c.blob), { type: 'audio/webm;codecs=opus' });
      }
      
      this.log('🔄 Processing trimmed audio', { finalBlobSize: finalBlob.size });
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
                sampleRateHertz: 48000,
                languageCode: 'en-US',
                enableAutomaticPunctuation: true,
                model: 'latest_long'
              }
            }
          });

          if (error) throw error;
          
          const transcript = data?.transcript || '';
          this.log('📝 Transcript received', { length: transcript.length });
          
          // Save debug audio if STT failed (empty transcript)
          if (!transcript || transcript.trim().length === 0) {
            this.log('⚠️ Empty transcript - saving debug audio');
            
            if (this.options.onDebugAudioSave) {
              const debugMetadata = {
                service: 'chat-text',
                voiceDetected: !!this.voiceConfirmedAt,
                bufferChunks: this.circularBuffer.length,
                finalBlobSize: finalBlob.size,
                reason: 'empty-transcript-from-stt'
              };
              
              await this.saveDebugAudio(finalBlob, debugMetadata);
              this.options.onDebugAudioSave(finalBlob, 'stt-empty-transcript');
            }
          }
          
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
    this.circularBuffer = [];
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
