// Simple Universal STT Recorder - no chunks, no rolling buffer, just record and stop

export interface STTRecorderOptions {
  onTranscriptReady?: (transcript: string) => void;
  onError?: (error: Error) => void;
  onLevel?: (level: number) => void;
  silenceThreshold?: number;
  silenceDuration?: number;
  mode?: string; // e.g., 'conversation'
  onProcessingStart?: () => void; // fired when recording stops and processing begins
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
  private highPassFilter: BiquadFilterNode | null = null;
  private lowPassFilter: BiquadFilterNode | null = null;
  private mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;
  private filteredStream: MediaStream | null = null;
  
  // Control
  private silenceTimer: NodeJS.Timeout | null = null;
  private isRecording = false;
  private options: STTRecorderOptions;

  constructor(options: STTRecorderOptions = {}) {
    this.options = {
      silenceThreshold: 0.02,
      silenceDuration: 1200, // 1.2 seconds
      ...options
    };
  }

  async start(): Promise<void> {
    if (this.isRecording) return;

    try {
      // Step 1: Request mic access
      this.mediaStream = await this.requestMicrophoneAccess();
      
      // Step 2: Setup filtered audio chain and energy monitoring
      this.setupEnergyMonitoring();
      
      // Step 3: Setup MediaRecorder against filtered output stream (falls back to raw if needed)
      this.setupMediaRecorder(this.filteredStream || this.mediaStream!);
      
      // Step 4: Start recording
      this.mediaRecorder!.start();
      this.isRecording = true;

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

    return stream;
  }

  stop(): void {
    if (!this.isRecording || !this.mediaRecorder) return;

    this.mediaRecorder.stop();
    this.isRecording = false;
    // Intentionally DO NOT cleanup here so energy monitoring continues
  }

  // Start a new recording segment quickly using existing MediaRecorder/stream
  startNewRecording(): void {
    if (!this.mediaRecorder || this.isRecording) return;
    try {
      // Ensure input is enabled
      this.resumeInput();
      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (e) {
      console.error('[UniversalSTTRecorder] Failed to start new recording segment:', e);
    }
  }

  // Pause mic input without tearing down the stream
  pauseInput(): void {
    if (!this.mediaStream) return;
    this.mediaStream.getAudioTracks().forEach(track => {
      track.enabled = false;
    });
  }

  // Resume mic input
  resumeInput(): void {
    if (!this.mediaStream) return;
    this.mediaStream.getAudioTracks().forEach(track => {
      track.enabled = true;
    });
  }

  private setupMediaRecorder(stream: MediaStream): void {
    const mimeType = this.getSupportedMimeType();
    
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimeType
    });

    // Single blob storage (not chunks)
    this.audioBlob = null;
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioBlob = event.data; // Store the entire recording as one blob
      }
    };

    this.mediaRecorder.onstop = () => {
      this.processRecording();
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

    // Create AudioContext and filtered chain
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // High-pass filter: cut low-frequency rumble
    this.highPassFilter = this.audioContext.createBiquadFilter();
    this.highPassFilter.type = 'highpass';
    this.highPassFilter.frequency.value = 100; // Hz
    this.highPassFilter.Q.value = 0.8;

    // Low-pass filter: tame high-frequency hiss
    this.lowPassFilter = this.audioContext.createBiquadFilter();
    this.lowPassFilter.type = 'lowpass';
    this.lowPassFilter.frequency.value = 8000; // Hz
    this.lowPassFilter.Q.value = 0.7;

    // Analyser for energy monitoring
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    // Destination for MediaRecorder (record filtered audio)
    this.mediaStreamDestination = this.audioContext.createMediaStreamDestination();

    // Wire graph: source -> HPF -> LPF -> analyser & destination
    sourceNode.connect(this.highPassFilter);
    this.highPassFilter.connect(this.lowPassFilter);
    this.lowPassFilter.connect(this.analyser);
    this.lowPassFilter.connect(this.mediaStreamDestination);

    // Expose filtered stream for recording
    this.filteredStream = this.mediaStreamDestination.stream;

    // Prepare data array and start monitoring
    this.dataArray = new Float32Array(this.analyser.fftSize);
    this.startEnergyMonitoring();
  }

  private startEnergyMonitoring(): void {
    if (!this.analyser || !this.dataArray) return;

    let lastLevel = 0;
    
    const updateAnimation = () => {
      // Always sample analyser while the graph exists
      if (!this.analyser || !this.dataArray) return;

      // Get current audio data - create a fresh array to avoid type issues
      const tempArray = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(tempArray);
      this.dataArray = tempArray;
      
      // Calculate RMS energy (lightweight)
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        sum += this.dataArray[i] * this.dataArray[i];
      }
      const rms = Math.sqrt(sum / this.dataArray.length);
      
      // Smooth level changes for UI (prevent jittery animation)
      const rawLevel = Math.min(1, rms * 15);
      const smoothedLevel = lastLevel * 0.7 + rawLevel * 0.3;
      lastLevel = smoothedLevel;

      // Feed energy signal to animation
      this.options.onLevel?.(smoothedLevel);

      // Log occasionally for debugging (removed to reduce noise)
      // if (Math.random() < 0.01) {
      //   console.log('[UniversalSTTRecorder] Energy level:', smoothedLevel.toFixed(4), 'isSpeaking:', smoothedLevel > this.options.silenceThreshold!);
      // }

      // Only run VAD/silence stop logic while actively recording
      if (this.isRecording) {
        const isSpeaking = smoothedLevel > this.options.silenceThreshold!;
        if (!isSpeaking) {
          // Start silence timer
          if (!this.silenceTimer) {
            this.silenceTimer = setTimeout(() => {
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
      }

      this.animationFrame = requestAnimationFrame(updateAnimation);
    };

    updateAnimation(); // Start the energy monitoring loop
  }

  private processRecording(): void {
    if (!this.audioBlob) {
      return;
    }

    // Snapshot and clear early to free memory
    const blob = this.audioBlob;
    this.audioBlob = null;
    // Notify processing start (e.g., show spinner)
    try { this.options.onProcessingStart?.(); } catch {}
    
    // Fire-and-forget STT: schedule to avoid blocking UI thread
    try {
      // Prefer microtask if available
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(() => { this.sendToSTT(blob).catch(() => {}); });
      } else {
        setTimeout(() => { this.sendToSTT(blob).catch(() => {}); }, 0);
      }
    } catch {
      // Fallback
      setTimeout(() => { this.sendToSTT(blob).catch(() => {}); }, 0);
    }
  }

  private async sendToSTT(audioBlob: Blob): Promise<void> {
    try {
      // Import STT service dynamically to avoid circular dependencies
      const { sttService } = await import('@/services/voice/stt');
      const { chat_id } = (await import('@/core/store')).useChatStore.getState();
      
      if (!chat_id) {
        throw new Error('No chat_id available for STT');
      }
      
      // In conversation mode, STT is fire-and-forget - no transcript return
      if (this.options.mode === 'conversation') {
        // Immediately trigger thinking state via callback
        if (this.options.onTranscriptReady) {
          this.options.onTranscriptReady(''); // Empty string triggers thinking state
        }
        
        // Fire-and-forget STT call - backend handles everything
        sttService.transcribe(audioBlob, chat_id, {}, this.options.mode).catch((error) => {
          console.error('[UniversalSTTRecorder] STT fire-and-forget failed:', error);
          this.options.onError?.(error as Error);
        });
        return;
      }
      
      // For non-conversation mode (chat bar), await transcript and call callback
      const { transcript } = await sttService.transcribe(
        audioBlob,
        chat_id,
        {},
        this.options.mode
      );
      
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
    this.highPassFilter = null;
    this.lowPassFilter = null;
    this.mediaStreamDestination = null;
    this.filteredStream = null;
    this.dataArray = null;
    this.mediaRecorder = null;
    this.audioBlob = null;
  }

  dispose(): void {
    this.stop();
    this.cleanup();
  }
}