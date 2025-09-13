// Simple Universal STT Recorder - no chunks, no rolling buffer, just record and stop

export interface STTRecorderOptions {
  onTranscriptReady?: (transcript: string) => void;
  onError?: (error: Error) => void;
  onLevel?: (level: number) => void;
  silenceThreshold?: number;
  silenceDuration?: number;
}

export class UniversalSTTRecorder {
  // Recording components
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioBlob: Blob | null = null;
  
  // Energy monitoring components (separate from recording)
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrame: number | null = null;
  private dataArray: Float32Array | null = null;
  
  // Control
  private silenceTimer: NodeJS.Timeout | null = null;
  private isRecording = false;
  private options: STTRecorderOptions;

  constructor(options: STTRecorderOptions = {}) {
    this.options = {
      silenceThreshold: 0.01,
      silenceDuration: 1200, // 1.2 seconds
      ...options
    };
  }

  async start(): Promise<void> {
    if (this.isRecording) return;

    try {
      // Step 1: Request mic access
      console.log('[UniversalSTTRecorder] Step 1: Requesting mic access...');
      this.mediaStream = await this.requestMicrophoneAccess();
      
      // Step 2: Setup MediaRecorder for single blob recording
      console.log('[UniversalSTTRecorder] Step 2: Setting up MediaRecorder...');
      this.setupMediaRecorder();
      
      // Step 3: Setup energy signal for animation (separate from recording)
      console.log('[UniversalSTTRecorder] Step 3: Setting up energy monitoring...');
      this.setupEnergyMonitoring();
      
      // Step 4: Start recording
      console.log('[UniversalSTTRecorder] Step 4: Starting recording...');
      this.mediaRecorder!.start();
      this.isRecording = true;
      console.log('[UniversalSTTRecorder] Recording started successfully');

    } catch (error) {
      this.options.onError?.(error as Error);
      throw error;
    }
  }

  private async requestMicrophoneAccess(): Promise<MediaStream> {
    // Check for secure context (HTTPS)
    if (!window.isSecureContext && location.hostname !== 'localhost') {
      throw new Error('Microphone access requires HTTPS or localhost');
    }

    // Check for getUserMedia support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia is not supported in this browser');
    }

    // Request mic access - simple approach
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true,
      }
    });

    console.log('[UniversalSTTRecorder] Microphone access granted, tracks:', stream.getTracks().length);
    return stream;
  }

  stop(): void {
    if (!this.isRecording || !this.mediaRecorder) return;

    this.mediaRecorder.stop();
    this.isRecording = false;
    this.cleanup();
  }

  private setupMediaRecorder(): void {
    const mimeType = this.getSupportedMimeType();
    console.log('[UniversalSTTRecorder] Using MIME type:', mimeType);
    
    this.mediaRecorder = new MediaRecorder(this.mediaStream!, {
      mimeType: mimeType
    });

    // Single blob storage (not chunks)
    this.audioBlob = null;
    this.mediaRecorder.ondataavailable = (event) => {
      console.log('[UniversalSTTRecorder] Data available, size:', event.data.size);
      if (event.data.size > 0) {
        this.audioBlob = event.data; // Store the entire recording as one blob
      }
    };

    this.mediaRecorder.onstop = () => {
      console.log('[UniversalSTTRecorder] Recording stopped, processing blob...');
      this.processRecording();
    };

    this.mediaRecorder.onstart = () => {
      console.log('[UniversalSTTRecorder] MediaRecorder started');
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('[UniversalSTTRecorder] MediaRecorder error:', event);
    };
  }

  private setupEnergyMonitoring(): void {
    if (!this.mediaStream) {
      console.error('[UniversalSTTRecorder] No mediaStream for energy monitoring');
      return;
    }

    // Step 3: Setup energy signal for animation (separate from recording)
    console.log('[UniversalSTTRecorder] Creating AudioContext for energy monitoring...');
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    
    source.connect(this.analyser);
    
    // Create data array for energy calculation
    this.dataArray = new Float32Array(this.analyser.fftSize);
    
    console.log('[UniversalSTTRecorder] Starting energy monitoring...');
    this.startEnergyMonitoring();
  }

  private startEnergyMonitoring(): void {
    if (!this.analyser || !this.dataArray) return;

    let lastLevel = 0;
    
    const updateAnimation = () => {
      if (!this.isRecording || !this.analyser || !this.dataArray) return;

      // Get current audio data
      this.analyser.getFloatTimeDomainData(this.dataArray);
      
      // Calculate RMS energy (lightweight)
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i] * this.dataArray[i];
      }
      const rms = Math.sqrt(sum / this.dataArray.length);
      
      // Smooth level changes for UI (prevent jittery animation)
      const rawLevel = Math.min(1, rms * 15); // Boost sensitivity
      const smoothedLevel = lastLevel * 0.7 + rawLevel * 0.3; // Smoothing
      lastLevel = smoothedLevel;

      // Feed energy signal to animation
      this.options.onLevel?.(smoothedLevel);

      // Log occasionally for debugging
      if (Math.random() < 0.01) {
        console.log('[UniversalSTTRecorder] Energy level:', smoothedLevel.toFixed(4), 'isSpeaking:', smoothedLevel > this.options.silenceThreshold!);
      }

      // Voice Activity Detection (VAD) for silence detection
      const isSpeaking = smoothedLevel > this.options.silenceThreshold!;
      
      if (!isSpeaking) {
        // Start silence timer
        if (!this.silenceTimer) {
          this.silenceTimer = setTimeout(() => {
            console.log('[UniversalSTTRecorder] Silence detected, stopping recording');
            this.stop();
          }, this.options.silenceDuration);
        }
      } else {
        // Clear silence timer (voice detected)
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
      }

      this.animationFrame = requestAnimationFrame(updateAnimation);
    };

    updateAnimation(); // Start the energy monitoring loop
  }

  private processRecording(): void {
    if (!this.audioBlob) {
      console.log('[UniversalSTTRecorder] No audio blob to process');
      return;
    }

    console.log('[UniversalSTTRecorder] Processing single audio blob, size:', this.audioBlob.size);
    
    // Send single blob to STT
    this.sendToSTT(this.audioBlob);
  }

  private async sendToSTT(audioBlob: Blob): Promise<void> {
    try {
      // Import STT service dynamically to avoid circular dependencies
      const { sttService } = await import('@/services/voice/stt');
      const { chat_id } = (await import('@/core/store')).useChatStore.getState();
      
      if (!chat_id) {
        throw new Error('No chat_id available for STT');
      }
      
      const { transcript } = await sttService.transcribe(audioBlob, chat_id);
      
      if (transcript && transcript.trim().length > 0 && this.options.onTranscriptReady) {
        this.options.onTranscriptReady(transcript.trim());
      }
    } catch (error) {
      console.error('[UniversalSTTRecorder] STT failed:', error);
      this.options.onError?.(error as Error);
    }
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  }

  private cleanup(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.dataArray = null;
    this.mediaRecorder = null;
    this.audioBlob = null;
  }

  dispose(): void {
    this.stop();
    this.cleanup();
  }
}