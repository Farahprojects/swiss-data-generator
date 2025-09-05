/**
 * 🎯 SIMPLE VAD - Voice Activity Detection Only
 * 
 * Simplified VAD implementation that can be used
 * across different microphone domains (chat, conversation, journal).
 * 
 * No rolling buffer - just voice activity detection and recording.
 */

export interface RollingBufferVADOptions {
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
  audioChunks: Blob[];
}

export class RollingBufferVAD {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private monitoringRef = { current: false };
  
  private state: RollingBufferVADState = {
    phase: 'waiting_for_voice',
    voiceStarted: false,
    audioLevel: 0,
    audioChunks: []
  };
  
  private options: Required<RollingBufferVADOptions>;
  private vadState = {
    voiceStartTime: null as number | null,
    silenceStartTime: null as number | null
  };

  constructor(options: RollingBufferVADOptions = {}) {
    this.options = {
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
   * START - Begin simple VAD recording
   */
  async start(stream: MediaStream, audioContext: AudioContext, analyser: AnalyserNode): Promise<void> {
    this.log('🎯 Starting simple VAD');
    
    this.audioContext = audioContext;
    this.analyser = analyser;
    
    // Reset state
    this.state = {
      phase: 'waiting_for_voice',
      voiceStarted: false,
      audioLevel: 0,
      audioChunks: []
    };
    
    this.vadState = {
      voiceStartTime: null,
      silenceStartTime: null
    };

    // Create MediaRecorder with STRICT webm/opus configuration
    let options: MediaRecorderOptions = { 
      audioBitsPerSecond: 48000,  // Optimal bitrate for speech
      mimeType: 'audio/webm;codecs=opus'
    };
    
    // STRICT: Only use webm/opus format - no fallbacks to prevent format inconsistencies
    if (typeof MediaRecorder !== 'undefined' && 
        typeof MediaRecorder.isTypeSupported === 'function' && 
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      this.log('✅ Using STRICT webm/opus format');
    } else {
      this.error('❌ CRITICAL: webm/opus not supported - this will cause STT format errors');
      throw new Error('Browser does not support audio/webm;codecs=opus format required for STT');
    }

    this.mediaRecorder = new MediaRecorder(stream, options);

    // Handle data chunks for rolling buffer
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.handleAudioChunk(event.data);
      }
    };

    this.mediaRecorder.onerror = (event) => {
      this.error('❌ MediaRecorder error:', event);
      this.options.onError(new Error('Recording failed'));
    };

    // Start recording with 1 second time slices
    this.mediaRecorder.start(1000);
    
    // Start VAD monitoring
    this.startVADMonitoring();
  }

  /**
   * HANDLE AUDIO CHUNK - Simple audio collection
   */
  private handleAudioChunk(chunk: Blob): void {
    // Only collect audio after voice is detected
    if (this.state.voiceStarted) {
      this.state.audioChunks.push(chunk);
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
        requestAnimationFrame(checkVAD);
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

      this.monitoringRef.current = false;

      this.mediaRecorder.onstop = () => {
        const finalBlob = this.createFinalBlob();
        // Ensure VAD is fully reset after each turn to avoid stale buffers
        this.cleanup();
        resolve(finalBlob);
      };

      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      } else {
        const finalBlob = this.createFinalBlob();
        // Ensure VAD is fully reset after each turn to avoid stale buffers
        this.cleanup();
        resolve(finalBlob);
      }
    });
  }

  /**
   * CREATE FINAL BLOB - Simple audio blob creation
   */
  private createFinalBlob(): Blob | null {
    if (this.state.audioChunks.length === 0) {
      this.log('⚠️ No audio chunks collected');
      return null;
    }

    // STRICT: Always create blob with webm/opus type to ensure format consistency
    const finalBlob = new Blob(this.state.audioChunks, { type: 'audio/webm;codecs=opus' });
    
    // Validate blob type
    if (finalBlob.type !== 'audio/webm;codecs=opus') {
      this.error(`❌ CRITICAL: Blob type mismatch! Expected 'audio/webm;codecs=opus', got '${finalBlob.type}'`);
    }
    
    this.log(`✅ Final blob created: ${finalBlob.size} bytes, type: ${finalBlob.type}, chunks: ${this.state.audioChunks.length}`);
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
    
    this.monitoringRef.current = false;
    
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
      audioChunks: []
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