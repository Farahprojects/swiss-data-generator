/**
 * 🏆 GOLD STANDARD VAD - Professional Implementation
 * 
 * VAD + Rolling Buffer + MediaRecorder approach:
 * 1. VAD runs in Web Worker at 8-16kHz, mono (lightweight)
 * 2. VAD only decides start/stop speech, does not record
 * 3. Rolling buffer (Float32Array) of ~0.5s audio (circular overwrite)
 * 4. On speech start: flush rolling buffer + start MediaRecorder
 * 5. On speech stop: stop MediaRecorder + combine [buffer] + [chunks]
 * 6. Send combined audio to STT, then discard everything
 */

export interface GoldStandardVADOptions {
  voiceThreshold?: number;       // Energy threshold for voice detection (default: 0.01)
  silenceThreshold?: number;     // Energy threshold for silence (default: 0.005)
  silenceTimeoutMs?: number;     // How long of silence before stopping (default: 1200)
  bufferDurationMs?: number;     // Rolling buffer duration (default: 500ms)
  sampleRate?: number;           // Sample rate for VAD analysis (default: 16000)
  onVoiceStart?: () => void;     // Called when voice activity starts
  onVoiceStop?: (audioBlob: Blob) => void; // Called when voice stops with combined audio
  onError?: (error: Error) => void; // Called on errors
}

export interface GoldStandardVADState {
  isActive: boolean;
  isRecording: boolean;
  audioLevel: number;
}

export class GoldStandardVAD {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private worker: Worker | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  
  private isActive = false;
  private isRecording = false;
  private currentAudioLevel = 0;
  
  private options: Required<GoldStandardVADOptions>;
  private state: GoldStandardVADState = {
    isActive: false,
    isRecording: false,
    audioLevel: 0
  };
  
  // Rolling buffer for pre-speech audio
  private rollingBuffer: Float32Array | null = null;
  private bufferSize: number = 0;
  private bufferIndex: number = 0;
  private bufferFull: boolean = false;
  
  // MediaRecorder chunks for speech audio
  private mediaRecorderChunks: Blob[] = [];
  
  constructor(options: GoldStandardVADOptions = {}) {
    this.options = {
      voiceThreshold: 0.01,
      silenceThreshold: 0.005,
      silenceTimeoutMs: 1200,
      bufferDurationMs: 500,
      sampleRate: 16000,
      onVoiceStart: () => {},
      onVoiceStop: () => {},
      onError: () => {},
      ...options
    };
  }

  /**
   * START - Begin VAD monitoring and rolling buffer
   */
  async start(stream: MediaStream): Promise<void> {
    this.stream = stream;
    
    // Create AudioContext for VAD analysis
    this.audioContext = new AudioContext({ 
      sampleRate: this.options.sampleRate 
    });
    
    // Create analyser for energy detection
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    
    // Connect stream to analyser
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
    
    // Ensure AudioContext is running
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Initialize rolling buffer
    this.bufferSize = Math.floor(this.options.sampleRate * this.options.bufferDurationMs / 1000);
    this.rollingBuffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.bufferFull = false;
    
    // Create Web Worker for VAD
    this.worker = new Worker('/vad-worker.js');
    this.setupWorkerHandlers();
    
    // Configure worker
    this.worker.postMessage({
      type: 'config',
      data: {
        voiceThreshold: this.options.voiceThreshold,
        silenceThreshold: this.options.silenceThreshold,
        silenceTimeoutMs: this.options.silenceTimeoutMs
      }
    });
    
    // Set active state BEFORE starting monitoring
    this.isActive = true;
    this.state.isActive = true;
    
    // Start VAD monitoring
    this.startVADMonitoring();
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
          this.handleVoiceStart();
          break;
          
        case 'voiceStop':
          this.handleVoiceStop();
          break;
          
        case 'audioLevel':
          this.currentAudioLevel = audioLevel;
          this.state.audioLevel = audioLevel;
          break;
      }
    };
    
    this.worker.onerror = (error) => {
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
    
    const bufferLength = this.analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkVAD = () => {
      if (!this.isActive || !this.analyser || !this.worker) {
        return;
      }
      
      // Get audio data
      this.analyser.getByteTimeDomainData(dataArray);
      
      // Add to rolling buffer
      this.addToRollingBuffer(dataArray);
      
      // Send to worker for VAD analysis
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
   * ADD TO ROLLING BUFFER - Circular buffer for pre-speech audio
   */
  private addToRollingBuffer(dataArray: Uint8Array): void {
    if (!this.rollingBuffer) return;
    
    // Convert Uint8Array to Float32Array and add to rolling buffer
    for (let i = 0; i < dataArray.length; i++) {
      const sample = (dataArray[i] - 128) / 128; // Convert to float
      this.rollingBuffer[this.bufferIndex] = sample;
      
      this.bufferIndex = (this.bufferIndex + 1) % this.bufferSize;
      if (this.bufferIndex === 0) {
        this.bufferFull = true;
      }
    }
  }

  /**
   * HANDLE VOICE START - Flush rolling buffer and start MediaRecorder
   */
  private handleVoiceStart(): void {
    if (this.isRecording) return;
    
    this.isRecording = true;
    this.state.isRecording = true;
    
    // Create MediaRecorder for actual recording
    const recorderOptions: MediaRecorderOptions = {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 16000
    };
    
    if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      this.options.onError(new Error('Browser does not support audio/webm;codecs=opus format'));
      return;
    }
    
    this.mediaRecorder = new MediaRecorder(this.stream!, recorderOptions);
    this.mediaRecorderChunks = [];
    
    // Handle audio chunks
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.mediaRecorderChunks.push(event.data);
      }
    };
    
    this.mediaRecorder.onerror = (event) => {
      this.options.onError(new Error('MediaRecorder failed'));
    };
    
    // Start recording with small chunks
    this.mediaRecorder.start(100); // 100ms chunks
    
    this.options.onVoiceStart();
  }

  /**
   * HANDLE VOICE STOP - Stop MediaRecorder and combine audio
   */
  private handleVoiceStop(): void {
    if (!this.isRecording || !this.mediaRecorder) return;
    
    this.isRecording = false;
    this.state.isRecording = false;
    
    // Stop MediaRecorder
    this.mediaRecorder.stop();
    
    // Wait for final chunks, then combine audio
    this.mediaRecorder.onstop = () => {
      this.combineAndSendAudio();
    };
  }

  /**
   * COMBINE AND SEND AUDIO - Combine rolling buffer + MediaRecorder chunks
   */
  private combineAndSendAudio(): void {
    try {
      // Get rolling buffer audio (pre-speech)
      const rollingBufferBlob = this.createBlobFromFloat32Array(this.rollingBuffer!);
      
      // Get MediaRecorder chunks (speech)
      const speechBlob = new Blob(this.mediaRecorderChunks, { type: 'audio/webm;codecs=opus' });
      
      // Combine: [rolling buffer] + [speech chunks]
      const combinedBlob = new Blob([rollingBufferBlob, speechBlob], { type: 'audio/webm;codecs=opus' });
      
      // Send to callback
      this.options.onVoiceStop(combinedBlob);
      
      // Clean up - discard everything
      this.mediaRecorderChunks = [];
      this.bufferIndex = 0;
      this.bufferFull = false;
      
    } catch (error) {
      this.options.onError(error as Error);
    }
  }

  /**
   * CREATE BLOB FROM FLOAT32ARRAY - Convert rolling buffer to audio blob
   */
  private createBlobFromFloat32Array(float32Array: Float32Array): Blob {
    // Convert Float32Array to WAV format
    const length = float32Array.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, this.options.sampleRate, true);
    view.setUint32(28, this.options.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * GET STATE - Current VAD state
   */
  getState(): GoldStandardVADState {
    return { ...this.state };
  }

  /**
   * CLEANUP - Stop everything and clean up
   */
  cleanup(): void {
    this.isActive = false;
    this.isRecording = false;
    
    // Stop worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }
    
    // Close AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
    
    // Reset state
    this.mediaRecorderChunks = [];
    this.rollingBuffer = null;
    this.bufferIndex = 0;
    this.bufferFull = false;
    
    this.state = {
      isActive: false,
      isRecording: false,
      audioLevel: 0
    };
  }
}
