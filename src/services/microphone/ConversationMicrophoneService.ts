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

interface AudioChunk {
  blob: Blob;
  timestamp: number;
}

class ConversationMicrophoneServiceClass {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private circularBuffer: AudioChunk[] = []; // Circular buffer for retroactive trimming
  private bufferMaxDuration = 2000; // 2 seconds buffer
  private voiceConfirmedAt: number | null = null; // Timestamp when voice was confirmed
  private recordingStartedAt: number = 0; // When recording actually started
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
          // Request raw, unprocessed audio similar to chat text mic
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
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
          
          this.log(`📦 Buffer chunk added (${this.circularBuffer.length} chunks, ${chunk.blob.size} bytes)`);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.handleRecordingComplete();
      };

      this.mediaRecorder.onerror = (event) => {
        this.error('❌ MediaRecorder error:', event);
        if (this.options.onError) {
          this.options.onError(new Error('Recording failed'));
        }
        this.cleanup();
      };

      // Start recording with 100ms chunks for precise circular buffering
      this.mediaRecorder.start(100);
      
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
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.log('📼 Recording completed - blob size:', audioBlob.size);
        
        this.cleanup();
        resolve(audioBlob);
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
   * HANDLE RECORDING COMPLETE - Process finished recording
   */
  private handleRecordingComplete(): void {
    // Retroactive trimming based on voice confirmation
    let finalBlob: Blob;
    
    if (this.voiceConfirmedAt && this.circularBuffer.length > 0) {
      // Trim buffer to include only audio from voice confirmation onwards
      const voiceChunks = this.circularBuffer.filter(chunk => 
        chunk.timestamp >= this.voiceConfirmedAt!
      );
      
      this.log(`🎯 Voice-trimmed audio: ${voiceChunks.length}/${this.circularBuffer.length} chunks kept`);
      this.log(`📊 Voice confirmed at: ${this.voiceConfirmedAt}, recording started at: ${this.recordingStartedAt}`);
      
      finalBlob = new Blob(voiceChunks.map(c => c.blob), { type: 'audio/webm' });
    } else {
      // No voice detected - return empty blob or minimal buffer
      this.log('⚠️ No voice confirmation - returning minimal audio');
      finalBlob = new Blob(this.circularBuffer.slice(-2).map(c => c.blob), { type: 'audio/webm' });
    }
    
    this.log(`📼 Final audio blob: ${finalBlob.size} bytes`);
    
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
    this.audioChunks = [];
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
    
    // Industry-standard thresholds
    const VOICE_START_THRESHOLD = 0.05;  // ~-45dBFS - real voice detection
    const VOICE_START_DURATION = 250;    // 250ms sustained voice to confirm
    const SILENCE_THRESHOLD = 0.02;      // ~-55dBFS - silence detection
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
