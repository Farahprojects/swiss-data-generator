/**
 * 🎯 SIMPLE VAD - Mobile-Friendly Voice Activity Detection
 * 
 * Lightweight, energy-based VAD optimized for mobile performance.
 * Uses sliding buffer window and simple energy thresholds.
 */

export interface SimpleVADOptions {
  voiceThreshold?: number;       // Energy threshold for voice detection (default: 0.01)
  silenceThreshold?: number;     // Energy threshold for silence (default: 0.005)
  silenceTimeoutMs?: number;     // How long of silence before stopping (default: 1500)
  bufferWindowMs?: number;       // Sliding buffer window size (default: 200)
  sampleRate?: number;           // Sample rate for analysis (default: 16000)
  onVoiceStart?: () => void;     // Called when voice activity starts
  onSilenceDetected?: () => void; // Called when silence timeout reached
  onError?: (error: Error) => void; // Called on errors
}

export interface SimpleVADState {
  isRecording: boolean;
  audioLevel: number;
  bufferSize: number;
}

export class SimpleVAD {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private isActive = false;
  private animationFrameId: number | null = null;
  
  private options: Required<SimpleVADOptions>;
  private state: SimpleVADState = {
    isRecording: false,
    audioLevel: 0,
    bufferSize: 0
  };
  
  // Sliding buffer for audio data
  private audioBuffer: Float32Array;
  private bufferIndex = 0;
  private bufferFull = false;
  
  // VAD state
  private silenceStartTime: number | null = null;
  private lastVoiceTime = 0;

  constructor(options: SimpleVADOptions = {}) {
    this.options = {
      voiceThreshold: 0.01,
      silenceThreshold: 0.005,
      silenceTimeoutMs: 1500,
      bufferWindowMs: 200,
      sampleRate: 16000, // Lower sample rate for VAD analysis
      onVoiceStart: () => {},
      onSilenceDetected: () => {},
      onError: () => {},
      ...options
    };
    
    // Initialize sliding buffer
    const bufferSize = Math.floor((this.options.bufferWindowMs * this.options.sampleRate) / 1000);
    this.audioBuffer = new Float32Array(bufferSize);
    this.state.bufferSize = bufferSize;
  }

  /**
   * START - Begin VAD monitoring and recording
   */
  async start(stream: MediaStream): Promise<void> {
    this.log('🎯 Starting Simple VAD');
    
    // Create AudioContext with lower sample rate for VAD
    this.audioContext = new AudioContext({ 
      sampleRate: this.options.sampleRate 
    });
    
    // Create analyser for energy detection
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256; // Smaller FFT for performance
    this.analyser.smoothingTimeConstant = 0.8;
    
    // Connect stream to analyser
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
    
    // Create MediaRecorder with strict webm/opus
    const recorderOptions: MediaRecorderOptions = {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 48000
    };
    
    if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      throw new Error('Browser does not support audio/webm;codecs=opus format');
    }
    
    this.mediaRecorder = new MediaRecorder(stream, recorderOptions);
    
    // Handle audio chunks
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.handleAudioChunk(event.data);
      }
    };
    
    this.mediaRecorder.onerror = (event) => {
      this.error('❌ MediaRecorder error:', event);
      this.options.onError(new Error('Recording failed'));
    };
    
    // Start recording with small chunks
    this.mediaRecorder.start(100); // 100ms chunks
    
    // Start VAD monitoring
    this.startVADMonitoring();
    
    this.isActive = true;
    this.log('✅ Simple VAD started');
  }

  /**
   * START VAD MONITORING - Lightweight energy-based detection
   */
  private startVADMonitoring(): void {
    if (!this.analyser || this.animationFrameId !== null) {
      return;
    }
    
    this.log('✅ VAD monitoring started');
    
    const bufferLength = this.analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkVAD = () => {
      if (!this.isActive || !this.analyser) {
        return;
      }
      
      // Get audio data
      this.analyser.getByteTimeDomainData(dataArray);
      
      // Calculate RMS energy
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        const centered = (dataArray[i] - 128) / 128;
        sumSquares += centered * centered;
      }
      const rms = Math.sqrt(sumSquares / bufferLength);
      this.state.audioLevel = rms;
      
      // Add to sliding buffer
      this.addToBuffer(rms);
      
      const now = Date.now();
      
      if (!this.state.isRecording) {
        // Not recording: look for voice start
        if (rms > this.options.voiceThreshold) {
          this.state.isRecording = true;
          this.lastVoiceTime = now;
          this.silenceStartTime = null;
          this.log('🎤 Voice detected - starting recording');
          this.options.onVoiceStart();
        }
      } else {
        // Recording: look for silence
        if (rms > this.options.voiceThreshold) {
          // Voice still active
          this.lastVoiceTime = now;
          this.silenceStartTime = null;
        } else if (rms < this.options.silenceThreshold) {
          // Silence detected
          if (this.silenceStartTime === null) {
            this.silenceStartTime = now;
          } else if (now - this.silenceStartTime >= this.options.silenceTimeoutMs) {
            // Silence timeout reached
            this.log('🧘‍♂️ Silence detected - stopping recording');
            this.isActive = false;
            this.options.onSilenceDetected();
            return;
          }
        } else {
          // Reset silence timer if energy is between thresholds
          this.silenceStartTime = null;
        }
      }
      
      // Continue monitoring
      this.animationFrameId = requestAnimationFrame(checkVAD);
    };
    
    checkVAD();
  }

  /**
   * ADD TO SLIDING BUFFER - Simple circular buffer
   */
  private addToBuffer(value: number): void {
    this.audioBuffer[this.bufferIndex] = value;
    this.bufferIndex = (this.bufferIndex + 1) % this.audioBuffer.length;
    
    if (!this.bufferFull && this.bufferIndex === 0) {
      this.bufferFull = true;
    }
  }

  /**
   * HANDLE AUDIO CHUNK - Store for final blob creation
   */
  private audioChunks: Blob[] = [];
  
  private handleAudioChunk(chunk: Blob): void {
    if (this.state.isRecording) {
      this.audioChunks.push(chunk);
    }
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

      this.isActive = false;
      
      // Cancel animation frame
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      this.mediaRecorder.onstop = () => {
        const finalBlob = this.createFinalBlob();
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
   * CREATE FINAL BLOB - Combine recorded chunks
   */
  private createFinalBlob(): Blob | null {
    if (this.audioChunks.length === 0) {
      this.log('⚠️ No audio chunks recorded');
      return null;
    }

    const finalBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
    this.log(`✅ Final blob created: ${finalBlob.size} bytes`);
    
    // Clear chunks for next recording
    this.audioChunks = [];
    
    return finalBlob;
  }

  /**
   * GET STATE - Current VAD state
   */
  getState(): SimpleVADState {
    return { ...this.state };
  }

  /**
   * CLEANUP - Reset all state
   */
  cleanup(): void {
    this.log('🧹 Cleaning up Simple VAD');
    
    this.isActive = false;
    
    // Cancel animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    // Close AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
    
    // Reset state
    this.mediaRecorder = null;
    this.audioContext = null;
    this.analyser = null;
    this.audioChunks = [];
    this.bufferIndex = 0;
    this.bufferFull = false;
    this.silenceStartTime = null;
    this.lastVoiceTime = 0;
    
    this.state = {
      isRecording: false,
      audioLevel: 0,
      bufferSize: this.audioBuffer.length
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
    console.log('[SimpleVAD]', message, ...args);
  }

  private error(message: string, ...args: any[]): void {
    console.error('[SimpleVAD]', message, ...args);
  }
}
