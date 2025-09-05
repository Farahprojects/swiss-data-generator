/**
 * 🎯 ROLLING BUFFER VAD - Shared Core Logic
 * 
 * Professional rolling buffer VAD implementation that can be used
 * across different microphone domains (chat, conversation, journal).
 * 
 * This solves the "clipped first syllable" problem by maintaining
 * a rolling lookback buffer that gets prepended when voice starts.
 */

export interface RollingBufferVADOptions {
  lookbackWindowMs?: number;     // How much audio to keep in rolling buffer (default: 750ms)
  chunkDurationMs?: number;      // How often to slice chunks (default: 250ms)
  voiceThreshold?: number;       // RMS threshold for voice detection (default: 0.012)
  silenceThreshold?: number;     // RMS threshold for silence (default: 0.008)
  voiceConfirmMs?: number;       // Duration to confirm voice start (default: 300ms)
  silenceTimeoutMs?: number;     // Silence timeout duration (default: 1500ms)
  onVoiceStart?: () => void;     // Called when voice activity starts
  onSilenceDetected?: () => void; // Called when silence timeout reached
  onError?: (error: Error) => void; // Called on errors
}

export interface RollingBufferVADState {
  phase: 'waiting_for_voice' | 'monitoring_silence';
  voiceStarted: boolean;
  audioLevel: number;
  preBufferChunks: Blob[];
  activeChunks: Blob[];
}

export class RollingBufferVAD {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private monitoringRef = { current: false };
  private animationFrameId: number | null = null;
  
  private state: RollingBufferVADState = {
    phase: 'waiting_for_voice',
    voiceStarted: false,
    audioLevel: 0,
    preBufferChunks: [],
    activeChunks: []
  };
  
  private options: Required<RollingBufferVADOptions>;
  private vadState = {
    voiceStartTime: null as number | null,
    silenceStartTime: null as number | null
  };

  constructor(options: RollingBufferVADOptions = {}) {
    this.options = {
      lookbackWindowMs: 750,
      chunkDurationMs: 250,       // Consistent 250ms chunks for all domains
      voiceThreshold: 0.012,
      silenceThreshold: 0.008,
      voiceConfirmMs: 300,
      silenceTimeoutMs: 1500,
      onVoiceStart: () => {},
      onSilenceDetected: () => {},
      onError: () => {},
      ...options
    };
  }

  /**
   * START - Begin rolling buffer recording and VAD
   */
  async start(stream: MediaStream, audioContext: AudioContext, analyser: AnalyserNode): Promise<void> {
    this.log('🎯 Starting rolling buffer VAD');
    
    this.audioContext = audioContext;
    this.analyser = analyser;
    
    // Reset state
    this.state = {
      phase: 'waiting_for_voice',
      voiceStarted: false,
      audioLevel: 0,
      preBufferChunks: [],
      activeChunks: []
    };
    
    this.vadState = {
      voiceStartTime: null,
      silenceStartTime: null
    };

    // Create MediaRecorder with AGGRESSIVE webm/opus configuration
    const options: MediaRecorderOptions = { 
      audioBitsPerSecond: 48000,  // Optimal bitrate for speech
      mimeType: 'audio/webm;codecs=opus'
    };
    
    // AGGRESSIVE: Only use webm/opus format - no fallbacks to prevent format inconsistencies
    if (typeof MediaRecorder !== 'undefined' && 
        typeof MediaRecorder.isTypeSupported === 'function') {
      
      // Log all supported types for debugging
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ];
      
      this.log('🔍 MediaRecorder supported types:');
      supportedTypes.forEach(type => {
        const supported = MediaRecorder.isTypeSupported(type);
        this.log(`  ${supported ? '✅' : '❌'} ${type}`);
      });
      
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        this.log('✅ Using AGGRESSIVE webm/opus format');
      } else {
        this.error('❌ CRITICAL: webm/opus not supported - this will cause STT format errors');
        throw new Error('Browser does not support audio/webm;codecs=opus format required for STT');
      }
    } else {
      this.error('❌ CRITICAL: MediaRecorder not available');
      throw new Error('MediaRecorder not available in this browser');
    }

    this.mediaRecorder = new MediaRecorder(stream, options);

    // CRITICAL: Validate MediaRecorder is using the correct format
    if (this.mediaRecorder.mimeType !== 'audio/webm;codecs=opus') {
      this.error(`❌ CRITICAL: MediaRecorder format mismatch! Expected 'audio/webm;codecs=opus', got '${this.mediaRecorder.mimeType}'`);
      throw new Error(`MediaRecorder not using correct format: ${this.mediaRecorder.mimeType}`);
    }
    this.log(`✅ MediaRecorder confirmed using: ${this.mediaRecorder.mimeType}`);

    // Handle data chunks for rolling buffer
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        // CRITICAL: Log chunk details for debugging
        this.log(`📦 Chunk received: size=${event.data.size}, type=${event.data.type}`);
        
        // Log first few bytes of chunk to verify format
        const reader = new FileReader();
        reader.onload = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          const firstBytes = Array.from(new Uint8Array(arrayBuffer.slice(0, 16)))
            .map(b => b.toString(16).padStart(2, '0')).join(' ');
          this.log(`📦 Chunk first bytes: ${firstBytes}`);
        };
        reader.readAsArrayBuffer(event.data.slice(0, 16));
        
        this.handleAudioChunk(event.data);
      }
    };

    this.mediaRecorder.onerror = (event) => {
      this.error('❌ MediaRecorder error:', event);
      this.options.onError(new Error('Recording failed'));
    };

    // Start recording with small time slices
    this.mediaRecorder.start(this.options.chunkDurationMs);
    
    // Start VAD monitoring
    this.startVADMonitoring();
  }

  /**
   * HANDLE AUDIO CHUNK - Manage rolling buffer logic
   */
  private handleAudioChunk(chunk: Blob): void {
    if (!this.state.voiceStarted) {
      // Pre-voice: Add to rolling buffer
      this.state.preBufferChunks.push(chunk);
      
      // Maintain rolling window by removing old chunks
      const maxChunks = Math.ceil(this.options.lookbackWindowMs / this.options.chunkDurationMs);
      if (this.state.preBufferChunks.length > maxChunks) {
        this.state.preBufferChunks.shift();
      }
    } else {
      // Post-voice: Add to active recording
      this.state.activeChunks.push(chunk);
    }
  }

  /**
   * START VAD MONITORING - Two-phase voice activity detection
   */
  private startVADMonitoring(): void {
    if (!this.analyser || this.monitoringRef.current) {
      return;
    }
    
    this.monitoringRef.current = true;
    this.log('✅ VAD monitoring started');

    const bufferLength = this.analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    
    let lastSampleTime = 0;
    const targetIntervalMs = 33; // ~30 fps sampling
    
    const checkVAD = () => {
      if (!this.monitoringRef.current || !this.analyser) {
        return;
      }
      
      // Throttle sampling for performance
      const nowHr = performance.now();
      if (nowHr - lastSampleTime < targetIntervalMs) {
        if (this.monitoringRef.current) requestAnimationFrame(checkVAD);
        return;
      }
      lastSampleTime = nowHr;

      // Calculate RMS audio level
      this.analyser.getByteTimeDomainData(dataArray);
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        const centered = (dataArray[i] - 128) / 128;
        sumSquares += centered * centered;
      }
      const rms = Math.sqrt(sumSquares / bufferLength);
      this.state.audioLevel = rms;
      
      const now = Date.now();
      
      if (this.state.phase === 'waiting_for_voice') {
        // Phase 1: Wait for voice activity
        if (rms > this.options.voiceThreshold) {
          if (this.vadState.voiceStartTime === null) {
            this.vadState.voiceStartTime = now;
          } else if (now - this.vadState.voiceStartTime >= this.options.voiceConfirmMs) {
            // Voice confirmed! Switch to active recording
            this.state.phase = 'monitoring_silence';
            this.state.voiceStarted = true;
            this.vadState.voiceStartTime = null;
            this.log(`🎤 Voice activity confirmed - switching to active recording`);
            this.options.onVoiceStart();
          }
        } else {
          this.vadState.voiceStartTime = null;
        }
        
      } else if (this.state.phase === 'monitoring_silence') {
        // Phase 2: Monitor for silence after voice
        if (rms < this.options.silenceThreshold) {
          if (this.vadState.silenceStartTime === null) {
            this.vadState.silenceStartTime = now;
          } else if (now - this.vadState.silenceStartTime >= this.options.silenceTimeoutMs) {
            // Natural silence detected
            this.log(`🧘‍♂️ Silence detected - stopping recording`);
            this.monitoringRef.current = false;
            this.options.onSilenceDetected();
            return;
          }
        } else {
          this.vadState.silenceStartTime = null;
        }
      }

      if (this.monitoringRef.current) {
        this.animationFrameId = requestAnimationFrame(checkVAD);
      }
    };

    checkVAD();
  }

  /**
   * STOP - Stop recording and return final blob
   */
  stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      // Stop monitoring immediately to prevent race conditions
      this.monitoringRef.current = false;

      this.mediaRecorder.onstop = () => {
        const finalBlob = this.createFinalBlob();
        // Don't call cleanup here - let the caller handle it
        resolve(finalBlob);
      };

      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      } else {
        const finalBlob = this.createFinalBlob();
        resolve(finalBlob);
      }
    });
  }

  /**
   * CREATE FINAL BLOB - Combine pre-buffer and active chunks
   */
  private createFinalBlob(): Blob | null {
    let allChunks: Blob[] = [];
    
    if (this.state.voiceStarted && this.state.preBufferChunks.length > 0) {
      // Voice was detected: prepend lookback buffer
      allChunks = [...this.state.preBufferChunks, ...this.state.activeChunks];
      this.log(`📼 Final blob with lookback: ${this.state.preBufferChunks.length} pre + ${this.state.activeChunks.length} active chunks`);
    } else if (this.state.activeChunks.length > 0) {
      // No voice detected but we have chunks
      allChunks = this.state.activeChunks;
      this.log(`📼 Final blob without lookback: ${this.state.activeChunks.length} chunks`);
    } else {
      this.log('⚠️ No audio chunks collected');
      return null;
    }

    // CRITICAL: Log audio level information
    this.log(`🎵 Audio level during recording: ${this.state.audioLevel.toFixed(4)} (threshold: ${this.options.voiceThreshold})`);
    this.log(`🎵 Voice started: ${this.state.voiceStarted}, Phase: ${this.state.phase}`);

    // CRITICAL: Validate that all chunks have the same format before combining
    for (const chunk of allChunks) {
      if (chunk.type !== 'audio/webm;codecs=opus') {
        this.error(`❌ CRITICAL: Chunk format mismatch! Expected 'audio/webm;codecs=opus', got '${chunk.type}'`);
        return null;
      }
    }
    
    // Create final blob with explicit type - all chunks are validated to be webm/opus
    const finalBlob = new Blob(allChunks, { type: 'audio/webm;codecs=opus' });
    
    // Validate final blob
    if (finalBlob.type !== 'audio/webm;codecs=opus') {
      this.error(`❌ CRITICAL: Final blob format mismatch! Expected 'audio/webm;codecs=opus', got '${finalBlob.type}'`);
      return null;
    }
    
    // Additional validation: Check if blob is too small (likely corrupted)
    if (finalBlob.size < 1000) {
      this.error(`❌ CRITICAL: Final blob too small (${finalBlob.size} bytes) - likely corrupted`);
      return null;
    }
    
    this.log(`✅ Final blob created: ${finalBlob.size} bytes, type: ${finalBlob.type}`);
    return finalBlob;
  }

  /**
   * GET STATE - Current VAD state
   */
  getState(): RollingBufferVADState {
    return { ...this.state };
  }

  /**
   * CLEANUP - Reset all state
   */
  cleanup(): void {
    this.log('🧹 Cleaning up rolling buffer VAD');
    
    // Stop monitoring and cancel any pending animation frames
    this.monitoringRef.current = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    
    this.state = {
      phase: 'waiting_for_voice',
      voiceStarted: false,
      audioLevel: 0,
      preBufferChunks: [],
      activeChunks: []
    };
    
    this.vadState = {
      voiceStartTime: null,
      silenceStartTime: null
    };
  }

  private log(message: string, ...args: any[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const enabled = localStorage.getItem('debugAudio') === '1';
        if (!enabled) return;
      }
    } catch (error) {
      // Ignore localStorage errors
    }
    console.log('[RollingBufferVAD]', message, ...args);
  }

  private error(message: string, ...args: any[]): void {
    console.error('[RollingBufferVAD]', message, ...args);
  }
}