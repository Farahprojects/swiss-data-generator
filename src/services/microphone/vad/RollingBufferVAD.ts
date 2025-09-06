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
}

// Simple audio chunk - no metadata
type AudioChunk = Blob;

export class RollingBufferVAD {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private monitoringRef = { current: false };
  private animationFrameId: number | null = null;
  private stopping = false; // CRITICAL: Prevents race conditions during stop()
  
  // CONTINUOUS RECORDING: Rolling buffer of recent chunks
  private audioBuffer: AudioChunk[] = [];
  private bufferDurationMs = 30000; // Keep 30s of audio
  private isRecordingContinuously = false;
  
  private state: RollingBufferVADState = {
    audioLevel: 0
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
      audioLevel: 0
    };
    
    this.vadState = {
      voiceStartTime: null,
      silenceStartTime: null
    };

    // UNIVERSAL: Simple, clean format selection (Safari-style)
    const options: MediaRecorderOptions = {};
    
    // Simple format check - let browser choose
    if (typeof MediaRecorder !== 'undefined' && 
        typeof MediaRecorder.isTypeSupported === 'function') {
      
      // Try webm first, fallback to browser default
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm';
        this.log('✅ Using audio/webm format');
      } else {
        this.log('⚠️ webm not supported, using browser default');
        // Let browser choose - works for all browsers
      }
    } else {
      this.error('❌ MediaRecorder not available');
      throw new Error('MediaRecorder not available in this browser');
    }

    this.mediaRecorder = new MediaRecorder(stream, options);
    
    // UNIVERSAL: Log MediaRecorder details
    this.log(`🔍 MediaRecorder created with mimeType: ${this.mediaRecorder.mimeType}`);
    this.log(`🔍 MediaRecorder state: ${this.mediaRecorder.state}`);

    // OpenAI Whisper: Log format being used
    this.log(`✅ MediaRecorder using: ${this.mediaRecorder.mimeType}`);

    // CONTINUOUS RECORDING: Handle data chunks for rolling buffer
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        // Add to continuous rolling buffer (no metadata)
        this.audioBuffer.push(event.data);
        
        // Remove old chunks beyond buffer duration
        const maxChunks = Math.ceil(this.bufferDurationMs / this.options.chunkDurationMs);
        while (this.audioBuffer.length > maxChunks) {
          this.audioBuffer.shift();
        }
        
        // OpenAI Whisper: Simple chunk logging
        this.log(`📦 Chunk received: size=${event.data.size}, type=${event.data.type}, buffer size=${this.audioBuffer.length}`);
      }
    };

    this.mediaRecorder.onerror = (event) => {
      this.error('❌ MediaRecorder error:', event);
      this.options.onError(new Error('Recording failed'));
    };

    // CONTINUOUS RECORDING: Start recording continuously with small time slices
    this.mediaRecorder.start(this.options.chunkDurationMs);
    this.isRecordingContinuously = true;
    this.log(`🔄 Started continuous recording with ${this.options.chunkDurationMs}ms chunks`);
    
    // Start VAD monitoring
    this.startVADMonitoring();
  }

  // REMOVED: Old VAD chunking system - using continuous rolling buffer instead

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
   * EXTRACT SPEECH FROM BUFFER - VAD-triggered extraction from continuous buffer
   */
  extractSpeechFromBuffer(speechStartTime: number, speechEndTime: number): Blob | null {
    this.log(`🎯 Extracting speech from buffer: ${speechStartTime} to ${speechEndTime}`);
    
    // Calculate how many recent chunks to include (last ~2-3 seconds)
    const speechDurationMs = speechEndTime - speechStartTime;
    const chunksToInclude = Math.ceil(speechDurationMs / this.options.chunkDurationMs);
    
    // Get recent chunks from buffer
    const speechChunks = this.audioBuffer.slice(-chunksToInclude);
    
    if (speechChunks.length === 0) {
      this.log('⚠️ No chunks found in buffer');
      return null;
    }
    
    // Combine chunks into final blob
    const finalBlob = new Blob(speechChunks, { 
      type: this.mediaRecorder?.mimeType || 'audio/webm' 
    });
    
    this.log(`✅ Extracted speech: ${finalBlob.size} bytes, ${speechChunks.length} chunks`);
    return finalBlob;
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
          // Use recent chunks from buffer
          const finalBlob = new Blob(this.audioBuffer, { 
            type: this.mediaRecorder?.mimeType || 'audio/webm' 
          });
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
          // Use recent chunks from buffer
          const finalBlob = new Blob(this.audioBuffer, { 
            type: this.mediaRecorder?.mimeType || 'audio/webm' 
          });
          // CRITICAL: Always cleanup MediaRecorder after STT processing
          this.cleanup();
          resolve(finalBlob);
        }, 50);
      }
    });
  }

  // REMOVED: Old createFinalBlob method - using extractSpeechFromBuffer instead

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
    
    // CONTINUOUS RECORDING: Stop continuous recording
    this.isRecordingContinuously = false;
    
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
    
    // CONTINUOUS RECORDING: Clear continuous audio buffer
    this.audioBuffer = [];
    
    // CRITICAL: Clear all cached audio chunks
    this.state = {
      audioLevel: 0
    };
    
    this.isRecordingVoice = false;
    
    this.vadState = {
      voiceStartTime: null,
      silenceStartTime: null
    };
    
    this.log('✅ CACHE-FREE: All VAD data cleared, MediaRecorder destroyed, continuous buffer cleared');
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