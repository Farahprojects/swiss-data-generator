/**
 * 🎙️ CONVERSATION MICROPHONE SERVICE - Complete Domain Isolation
 * 
 * Handles ALL microphone functionality for AI conversation recording.
 * Completely isolated from other domains.
 */

import { microphoneArbitrator } from './MicrophoneArbitrator';

export interface ConversationMicrophoneOptions {
  onRecordingComplete?: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
  onSilenceDetected?: () => void;
  silenceTimeoutMs?: number;
}

class ConversationMicrophoneServiceClass {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = []; // Simple chunk collection
  private isRecording = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private monitoringRef = { current: false };
  private audioLevel = 0;
  
  private options: ConversationMicrophoneOptions = {};
  private listeners = new Set<() => void>();

  /**
   * INITIALIZE - Set up service with options
   */
  initialize(options: ConversationMicrophoneOptions): void {
    this.log('🔧 Initializing service');
    this.options = options;
  }

  /**
   * START RECORDING - Complete domain-specific recording
   */
  async startRecording(): Promise<boolean> {
    // Check permission from arbitrator
    if (!microphoneArbitrator.claim('conversation')) {
      this.error('❌ Cannot start - microphone in use by another domain');
      if (this.options.onError) {
        this.options.onError(new Error('Microphone is busy with another feature'));
      }
      return false;
    }

    try {
      this.log('🎤 Starting conversation recording');
      
      // Create our own stream - no sharing
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,           // Mono for efficiency
          echoCancellation: true,    // Clean input
          noiseSuppression: true,    // Remove background noise
          autoGainControl: true,     // Consistent levels
          sampleRate: 48000,
        } 
      });

      const trackSettings = this.stream.getAudioTracks()[0]?.getSettings?.() || {};
      this.log('🎛️ getUserMedia acquired. Track settings:', trackSettings);

      // Configure audio analysis for optional silence detection
      this.audioContext = new AudioContext({ sampleRate: 48000 });
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.mediaStreamSource.connect(this.analyser);

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
          this.log('📦 Chunk received', { 
            chunkSize: event.data.size, 
            totalChunks: this.audioChunks.length,
            totalSizeSoFar: this.audioChunks.reduce((sum, chunk) => sum + chunk.size, 0)
          });
        } else {
          this.log('⚠️ Empty chunk received - skipping');
        }
      };

      this.mediaRecorder.onstop = () => {
        this.log('⏹️ MediaRecorder stopped - processing complete WebM file');
        this.log('📊 Final chunk summary', {
          totalChunks: this.audioChunks.length,
          totalSize: this.audioChunks.reduce((sum, chunk) => sum + chunk.size, 0),
          chunkSizes: this.audioChunks.map(chunk => chunk.size)
        });
        this.handleRecordingComplete();
      };

      this.mediaRecorder.onerror = (event) => {
        this.error('❌ MediaRecorder error:', event);
        if (this.options.onError) {
          this.options.onError(new Error('Recording failed'));
        }
        this.cleanup();
      };

      // Start recording - let MediaRecorder handle chunking naturally
      this.mediaRecorder.start(500); // 500ms chunks to ensure we get multiple chunks
      
      this.notifyListeners();
      this.log('✅ Recording started successfully');

      // Start two-phase Voice Activity Detection
      this.startVoiceActivityDetection();
      return true;

    } catch (error) {
      this.error('❌ Failed to start recording:', error);
      microphoneArbitrator.release('conversation');
      
      if (this.options.onError) {
        this.options.onError(error instanceof Error ? error : new Error('Recording failed'));
      }
      
      return false;
    }
  }

  /**
   * STOP RECORDING - Clean domain-specific stop
   */
  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.isRecording || !this.mediaRecorder) {
        reject(new Error('No active recording to stop'));
        return;
      }

      this.log('🛑 Stopping conversation recording');
      
      this.isRecording = false;

      // Set up one-time handler for stop completion
      this.mediaRecorder.onstop = () => {
        const finalBlob = this.createFinalBlobFromBuffer();
        this.log('📼 Recording completed - blob size:', finalBlob.size);
        
        this.cleanup();
        resolve(finalBlob);
      };

      this.mediaRecorder.onerror = (event) => {
        this.error('❌ Stop recording error:', event);
        this.cleanup();
        reject(new Error('Failed to stop recording'));
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * CANCEL RECORDING - Cancel without processing
   */
  cancelRecording(): void {
    if (!this.isRecording) return;

    this.log('❌ Cancelling conversation recording');
    
    this.isRecording = false;
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    this.cleanup();
  }

  /**
   * CREATE FINAL BLOB FROM BUFFER - Build final audio with retroactive trimming
   */
  private createFinalBlobFromBuffer(): Blob {
    if (this.audioChunks.length === 0) {
      this.log('⚠️ No audio chunks - returning empty blob');
      return new Blob([], { type: 'audio/webm' });
    }

    // Create complete WebM file from all chunks
    this.log('🔧 Creating final Blob from chunks', {
      chunkCount: this.audioChunks.length,
      individualChunkSizes: this.audioChunks.map(chunk => chunk.size),
      totalChunkSize: this.audioChunks.reduce((sum, chunk) => sum + chunk.size, 0)
    });
    
    const finalBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
    
    this.log('📁 Final Blob created', {
      blobSize: finalBlob.size,
      blobType: finalBlob.type,
      expectedSize: this.audioChunks.reduce((sum, chunk) => sum + chunk.size, 0),
      sizeMatch: finalBlob.size === this.audioChunks.reduce((sum, chunk) => sum + chunk.size, 0)
    });
    
    return finalBlob;
  }

  /**
   * HANDLE RECORDING COMPLETE - Process finished recording
   */
  private handleRecordingComplete(): void {
    const finalBlob = this.createFinalBlobFromBuffer();
    
    if (this.options.onRecordingComplete) {
      this.options.onRecordingComplete(finalBlob);
    }
    
    this.cleanup();
  }

  /**
   * CLEANUP - Complete domain cleanup
   */
  private cleanup(): void {
    this.log('🧹 Cleaning up conversation microphone');

    // Disconnect audio nodes
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Stop stream tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        this.log('Stopping track:', track.kind);
        track.stop();
      });
      this.stream = null;
    }

    // Clear refs
    this.mediaRecorder = null;
    this.analyser = null;
    this.audioLevel = 0;
    this.monitoringRef.current = false;

    // Release arbitrator
    microphoneArbitrator.release('conversation');
    
    this.notifyListeners();
  }

  /**
   * GET STATE - For React hooks
   */
  getState() {
    return {
      isRecording: this.isRecording,
      hasStream: !!this.stream,
      audioLevel: this.audioLevel
    };
  }

  // Get current audio level for UI feedback
  getCurrentAudioLevel(): number {
    return this.audioLevel;
  }

  /**
   * GET STREAM - For external access (if needed)
   */
  getStream(): MediaStream | null {
    return this.stream;
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
   * FORCE CLEANUP - Emergency cleanup
   */
  forceCleanup(): void {
    this.log('🚨 Force cleanup');
    this.isRecording = false;
    this.cleanup();
  }

  // ----- Two-Phase Voice Activity Detection (VAD) -----
  private startVoiceActivityDetection(): void {
    if (!this.analyser || this.monitoringRef.current) return;
    this.monitoringRef.current = true;

    const bufferLength = this.analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    
    // VAD State Machine
    let phase: 'waiting_for_voice' | 'monitoring_silence' = 'waiting_for_voice';
    let voiceStartTime: number | null = null;
    let silenceStartTime: number | null = null;
    
    // Helper function to convert dB to RMS
    const dbToRms = (dB: number): number => Math.pow(10, dB / 20);
    
    // Professional thresholds - less sensitive for clean audio
    const VOICE_START_THRESHOLD = 0.05;  // Level ~50 - clear voice detection
    const VOICE_START_DURATION = 250;    // 250ms sustained voice to confirm
    const SILENCE_THRESHOLD = 0.02;      // Level ~20 - clear silence detection
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
      
      // Convert to dB for debugging
      const dB = rms > 0 ? 20 * Math.log10(rms) : -100;
      
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
            this.log(`🎤 Voice activity confirmed (RMS: ${rms.toFixed(4)}, dB: ${dB.toFixed(1)}) - now monitoring for ${SILENCE_TIMEOUT}ms silence`);
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
            this.log(`🧘‍♂️ ${SILENCE_TIMEOUT}ms silence detected after voice - stopping naturally (RMS: ${rms.toFixed(4)}, dB: ${dB.toFixed(1)})`);
            this.monitoringRef.current = false;
            if (this.options.onSilenceDetected) {
              this.options.onSilenceDetected();
            }
            // ❌ COMMENTED OUT - Let ChatController.endTurn() handle the stop to ensure proper STT flow
            // if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            //   this.mediaRecorder.stop();
            // }
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

  // ----- Logging helpers (gated) -----
  private log(message: string, ...args: any[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const enabled = localStorage.getItem('debugAudio') === '1';
        if (!enabled) return;
      }
    } catch {}
    // eslint-disable-next-line no-console
    console.log('[ConversationMic]', message, ...args);
  }

  private error(message: string, ...args: any[]): void {
    // eslint-disable-next-line no-console
    console.error('[ConversationMic]', message, ...args);
  }
}

// Singleton instance for conversation domain
export const conversationMicrophoneService = new ConversationMicrophoneServiceClass();
