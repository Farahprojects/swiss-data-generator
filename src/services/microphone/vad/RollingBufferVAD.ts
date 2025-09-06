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
  private stopping = false; // CRITICAL: Prevents race conditions during stop()
  
  private state: RollingBufferVADState = {
    audioLevel: 0,
    preBufferChunks: [],
    activeChunks: []
  };
  
  private options: Required<RollingBufferVADOptions>;
  private isRecordingVoice = false;
  private vadState = {
    voiceStartTime: null as number | null,
    silenceStartTime: null as number | null
  };

  constructor(options: RollingBufferVADOptions = {}) {
    this.options = {
      lookbackWindowMs: 1000,     // Increased for better voice detection (prevents clipping)
      chunkDurationMs: 100,       // Mobile-friendly: Smaller chunks for better compatibility
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
      audioLevel: 0,
      preBufferChunks: [],
      activeChunks: []
    };
    
    this.vadState = {
      voiceStartTime: null,
      silenceStartTime: null
    };

    // WHISPER-FRIENDLY: Explicit webm/opus format for all browsers
    const options: MediaRecorderOptions = {
      mimeType: 'audio/webm;codecs=opus'  // Whisper-optimized: Universal webm/opus
    };
    
    // Validate format support
    if (typeof MediaRecorder !== 'undefined' && 
        typeof MediaRecorder.isTypeSupported === 'function') {
      
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        this.log('✅ Using Whisper-optimized format: audio/webm;codecs=opus');
      } else {
        this.log('⚠️ webm/opus not supported, using browser default');
        delete options.mimeType; // Let browser choose
      }
    } else {
      this.error('❌ MediaRecorder not available');
      throw new Error('MediaRecorder not available in this browser');
    }

    this.mediaRecorder = new MediaRecorder(stream, options);
    
    // WHISPER DEBUG: Log what format MediaRecorder actually gave us
    this.log(`🔍 MediaRecorder created with mimeType: ${this.mediaRecorder.mimeType}`);
    this.log(`🔍 MediaRecorder state: ${this.mediaRecorder.state}`);
    this.log(`✅ Whisper-optimized MediaRecorder using: ${this.mediaRecorder.mimeType}`);

    // Handle data chunks for rolling buffer
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        // WHISPER: Simple chunk logging
        this.log(`📦 Chunk received: size=${event.data.size}, type=${event.data.type}`);
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
   * HANDLE AUDIO CHUNK - Simple chunk processing with race condition protection
   */
  private handleAudioChunk(chunk: Blob): void {
    // CRITICAL: Prevent chunks from being added during stop() to avoid corruption
    if (this.stopping) {
      this.log('⚠️ Ignoring chunk during stop() to prevent corruption');
      return;
    }
    
    // Always add to pre-buffer (rolling window)
    this.state.preBufferChunks.push(chunk);
    
    // Maintain rolling window by removing old chunks
    const maxChunks = Math.ceil(this.options.lookbackWindowMs / this.options.chunkDurationMs);
    if (this.state.preBufferChunks.length > maxChunks) {
      this.state.preBufferChunks.shift();
    }
    
    // If we're recording voice, also add to active chunks
    if (this.isRecordingVoice) {
      this.state.activeChunks.push(chunk);
    }
  }

  /**
   * START VAD MONITORING - Simple voice activity detection
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
      
      if (!this.isRecordingVoice) {
        // Waiting for voice activity
        if (rms > this.options.voiceThreshold) {
          if (this.vadState.voiceStartTime === null) {
            this.vadState.voiceStartTime = now;
          } else if (now - this.vadState.voiceStartTime >= this.options.voiceConfirmMs) {
            // Voice confirmed! Start recording
            this.isRecordingVoice = true;
            this.vadState.voiceStartTime = null;
            this.log(`🎤 Voice activity confirmed - starting recording`);
            this.options.onVoiceStart();
          }
        } else {
          this.vadState.voiceStartTime = null;
        }
        
      } else {
        // Recording voice - monitor for silence timeout
        if (rms < this.options.silenceThreshold) {
          if (this.vadState.silenceStartTime === null) {
            this.vadState.silenceStartTime = now;
          } else if (now - this.vadState.silenceStartTime >= this.options.silenceTimeoutMs) {
            // Silence timeout reached - stop recording
            this.log(`🔇 Silence timeout reached - stopping recording`);
            this.monitoringRef.current = false;
            this.options.onSilenceDetected();
            return;
          }
        } else {
          // Voice detected again - reset silence timer
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
   * STOP - Stop recording and return final blob with race condition protection
   */
  stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      // CRITICAL: Set stopping flag to prevent new chunks during stop()
      this.stopping = true;
      
      // Stop monitoring immediately to prevent race conditions
      this.monitoringRef.current = false;

      this.mediaRecorder.onstop = () => {
        // CRITICAL: Wait 50ms to ensure last chunk is processed
        setTimeout(() => {
          const finalBlob = this.createFinalBlob();
          // CRITICAL: Always cleanup MediaRecorder after STT processing
          this.cleanup();
          resolve(finalBlob);
        }, 50);
      };

      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      } else {
        // CRITICAL: Wait 50ms even for inactive recorder
        setTimeout(() => {
          const finalBlob = this.createFinalBlob();
          // CRITICAL: Always cleanup MediaRecorder after STT processing
          this.cleanup();
          resolve(finalBlob);
        }, 50);
      }
    });
  }

  /**
   * CREATE FINAL BLOB - Combine pre-buffer and active chunks
   */
  private createFinalBlob(): Blob | null {
    let allChunks: Blob[] = [];
    
    if (this.isRecordingVoice && this.state.preBufferChunks.length > 0) {
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
    this.log(`🎵 Recording voice: ${this.isRecordingVoice}`);

    // WHISPER-OPTIMIZED: Create final blob with MediaRecorder's actual format
    const finalBlob = new Blob(allChunks, { 
      type: this.mediaRecorder?.mimeType || 'audio/webm;codecs=opus' 
    });
    
    // WHISPER DEBUG: Log final blob details
    this.log(`🔍 Whisper final blob - size: ${finalBlob.size}, type: ${finalBlob.type}`);
    this.log(`🔍 MediaRecorder mimeType was: ${this.mediaRecorder?.mimeType}`);
    
    // Simple size check
    if (finalBlob.size < 100) {
      this.error(`❌ Final blob too small (${finalBlob.size} bytes) - likely empty`);
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
   * CLEANUP - Reset all state and destroy MediaRecorder completely
   */
  cleanup(): void {
    this.log('🧹 CACHE-FREE: Complete cleanup of RollingBufferVAD');
    
    // CRITICAL: Reset stopping flag
    this.stopping = false;
    
    // Stop monitoring and cancel any pending animation frames
    this.monitoringRef.current = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // CRITICAL: Completely destroy MediaRecorder to prevent format state retention
    if (this.mediaRecorder) {
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      // Remove all event listeners to prevent memory leaks
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.onerror = null;
      this.mediaRecorder = null;
    }
    
    this.audioContext = null;
    this.analyser = null;
    
    // CRITICAL: Clear all cached audio chunks
    this.state = {
      audioLevel: 0,
      preBufferChunks: [],    // Clear cached pre-buffer chunks
      activeChunks: []        // Clear cached active chunks
    };
    
    this.isRecordingVoice = false;
    
    this.vadState = {
      voiceStartTime: null,
      silenceStartTime: null
    };
    
    this.log('✅ CACHE-FREE: All VAD data cleared, MediaRecorder destroyed');
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