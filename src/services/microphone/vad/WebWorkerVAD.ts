/**
 * 🎯 WEB WORKER VAD - Mobile-Optimized Voice Activity Detection
 * 
 * Uses Web Worker to offload VAD analysis from UI thread.
 * Provides smooth animations and better mobile performance.
 */

export interface WebWorkerVADOptions {
  voiceThreshold?: number;       // Energy threshold for voice detection (default: 0.01)
  silenceThreshold?: number;     // Energy threshold for silence (default: 0.005)
  silenceTimeoutMs?: number;     // How long of silence before stopping (default: 1500)
  bufferWindowMs?: number;       // Sliding buffer window size (default: 200)
  sampleRate?: number;           // Sample rate for analysis (default: 16000)
  onVoiceStart?: () => void;     // Called when voice activity starts
  onSilenceDetected?: () => void; // Called when silence timeout reached
  onAudioLevel?: (level: number) => void; // Called with audio level updates
  onError?: (error: Error) => void; // Called on errors
}

export interface WebWorkerVADState {
  isRecording: boolean;
  audioLevel: number;
  isActive: boolean;
}

export class WebWorkerVAD {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private worker: Worker | null = null;
  private isActive = false;
  
  private options: Required<WebWorkerVADOptions>;
  private state: WebWorkerVADState = {
    isRecording: false,
    audioLevel: 0,
    isActive: false
  };
  
  // Audio chunks for current turn
  private currentTurnChunks: Blob[] = [];
  private allChunks: Blob[] = [];

  constructor(options: WebWorkerVADOptions = {}) {
    this.options = {
      voiceThreshold: 0.01,
      silenceThreshold: 0.005,
      silenceTimeoutMs: 1500,
      bufferWindowMs: 200,
      sampleRate: 16000,
      onVoiceStart: () => {},
      onSilenceDetected: () => {},
      onAudioLevel: () => {},
      onError: () => {},
      ...options
    };
  }

  /**
   * START - Begin VAD monitoring and recording
   */
  async start(stream: MediaStream): Promise<void> {
    this.log('🎯 Starting Web Worker VAD');
    
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
    
    // Create Web Worker
    this.worker = new Worker('/vad-worker.js');
    this.setupWorkerHandlers();
    
    // Configure worker
    this.worker.postMessage({
      type: 'config',
      data: {
        voiceThreshold: this.options.voiceThreshold,
        silenceThreshold: this.options.silenceThreshold,
        silenceTimeoutMs: this.options.silenceTimeoutMs,
        bufferWindowMs: this.options.bufferWindowMs
      }
    });
    
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
    this.state.isActive = true;
    this.log('✅ Web Worker VAD started');
  }

  /**
   * SETUP WORKER HANDLERS - Handle messages from worker
   */
  private setupWorkerHandlers(): void {
    if (!this.worker) return;
    
    this.worker.onmessage = (e) => {
      const { type, audioLevel, isRecording, timestamp } = e.data;
      
      switch (type) {
        case 'voiceStart':
          this.state.isRecording = true;
          this.log('🎤 Voice detected - starting recording');
          this.options.onVoiceStart();
          break;
          
        case 'silenceDetected':
          this.state.isRecording = false;
          this.log('🧘‍♂️ Silence detected - stopping recording');
          this.options.onSilenceDetected();
          break;
          
        case 'audioLevel':
          this.state.audioLevel = audioLevel;
          this.state.isRecording = isRecording;
          this.options.onAudioLevel(audioLevel);
          break;
      }
    };
    
    this.worker.onerror = (error) => {
      this.error('❌ Worker error:', error);
      this.options.onError(new Error('VAD worker failed'));
    };
  }

  /**
   * START VAD MONITORING - Send audio data to worker
   */
  private startVADMonitoring(): void {
    if (!this.analyser || !this.worker) {
      return;
    }
    
    this.log('✅ VAD monitoring started');
    
    const bufferLength = this.analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkVAD = () => {
      if (!this.isActive || !this.analyser || !this.worker) {
        return;
      }
      
      // Get audio data
      this.analyser.getByteTimeDomainData(dataArray);
      
      // Send to worker for processing
      this.worker.postMessage({
        type: 'audioData',
        data: dataArray
      });
      
      // Continue monitoring
      requestAnimationFrame(checkVAD);
    };
    
    checkVAD();
  }

  /**
   * HANDLE AUDIO CHUNK - Store for final blob creation
   */
  private handleAudioChunk(chunk: Blob): void {
    // Always store all chunks for continuous recording
    this.allChunks.push(chunk);
    
    // Store current turn chunks when recording
    if (this.state.isRecording) {
      this.currentTurnChunks.push(chunk);
    }
  }

  /**
   * STOP - Get current recording blob but continue VAD operation
   */
  stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      // Reset worker state for next recording
      if (this.worker) {
        this.worker.postMessage({ type: 'reset' });
      }

      // Get current blob without stopping MediaRecorder
      const finalBlob = this.createFinalBlob();
      resolve(finalBlob);
    });
  }

  /**
   * CREATE FINAL BLOB - Combine current turn chunks
   */
  private createFinalBlob(): Blob | null {
    if (this.currentTurnChunks.length === 0) {
      this.log('⚠️ No audio chunks recorded for this turn');
      return null;
    }

    const finalBlob = new Blob(this.currentTurnChunks, { type: 'audio/webm;codecs=opus' });
    this.log(`✅ Final blob created: ${finalBlob.size} bytes`);
    
    // Clear current turn chunks for next recording
    this.currentTurnChunks = [];
    
    return finalBlob;
  }

  /**
   * GET STATE - Current VAD state
   */
  getState(): WebWorkerVADState {
    return { ...this.state };
  }

  /**
   * CLEANUP - Reset all state
   */
  cleanup(): void {
    this.log('🧹 Cleaning up Web Worker VAD');
    
    this.isActive = false;
    this.state.isActive = false;
    
    // Terminate worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
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
    this.currentTurnChunks = [];
    this.allChunks = [];
    
    this.state = {
      isRecording: false,
      audioLevel: 0,
      isActive: false
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
    console.log('[WebWorkerVAD]', message, ...args);
  }

  private error(message: string, ...args: any[]): void {
    console.error('[WebWorkerVAD]', message, ...args);
  }
}
