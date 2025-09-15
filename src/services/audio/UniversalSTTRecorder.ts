// Simple Universal STT Recorder - no chunks, no rolling buffer, just record and stop

export interface STTRecorderOptions {
  onTranscriptReady?: (transcript: string) => void;
  onError?: (error: Error) => void;
  onLevel?: (level: number) => void;
  baselineCaptureDuration?: number; // ms to capture baseline energy (default: 1000)
  silenceMargin?: number; // percentage below baseline to trigger silence (default: 0.15)
  silenceHangover?: number; // ms before triggering silence (default: 300)
  enableBandpass?: boolean; // enable 100-4000Hz human speech filter (default: true)
  mode?: string; // e.g., 'conversation'
  onProcessingStart?: () => void; // fired when recording stops and processing begins
  triggerPercent?: number; // percentage above baseline to start capture (default: 0.2)
  preRollMs?: number; // how much audio before trigger to include (default: 300)
  timesliceMs?: number; // MediaRecorder timeslice for chunking (default: 100)
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
  private bandpassFilter: BiquadFilterNode | null = null;
  private mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;
  private filteredStream: MediaStream | null = null;
  
  // Simplified VAD state
  private silenceTimer: NodeJS.Timeout | null = null;
  private isRecording = false;
  private options: STTRecorderOptions;
  private baselineEnergy: number = 0;
  private baselineStartTime: number = 0;
  private baselineCapturing = false;
  private baselineEnergySum = 0;
  private baselineEnergyCount = 0;
  private vadArmUntilTs: number = 0; // time after which VAD can arm (post-baseline guard)

  // Chunked recording state for simple pre-roll and segmentation
  private preRollChunks: Blob[] = [];
  private activeChunks: Blob[] = [];
  private maxPreRollChunks: number = 3; // computed from preRollMs/timesliceMs
  private vadActive: boolean = false; // currently capturing a speech segment

  constructor(options: STTRecorderOptions = {}) {
    this.options = {
      baselineCaptureDuration: 1000, // 1 second to capture baseline
      silenceMargin: 0.15, // 15% below baseline
      silenceHangover: 300, // 300ms before triggering silence
      enableBandpass: true, // enable human speech filter
      triggerPercent: 0.2, // 20% above baseline to start
      preRollMs: 300,
      timesliceMs: 100,
      ...options
    };

    // Apply mobile-specific defaults unless explicitly overridden
    if (this.isMobileDevice()) {
      if (options.silenceMargin === undefined) {
        this.options.silenceMargin = 0.10; // more sensitive on mobile
      }
      if (options.silenceHangover === undefined) {
        this.options.silenceHangover = 500; // slightly longer to avoid premature stops
      }
      if (options.baselineCaptureDuration === undefined) {
        this.options.baselineCaptureDuration = 1500; // longer baseline capture on mobile
      }
    }
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
      
      // Step 4: Start recorder with timeslices so we can maintain a small pre-roll buffer
      const slice = Math.max(20, this.options.timesliceMs || 100);
      this.maxPreRollChunks = Math.max(1, Math.ceil((this.options.preRollMs || 300) / slice));
      this.mediaRecorder!.start(slice);
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
        autoGainControl: false,
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
      // Reset baseline and VAD state on quick restarts
      this.resetBaselineCapture();
      this.vadActive = false;
      this.preRollChunks = [];
      this.activeChunks = [];
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
      const slice = Math.max(20, this.options.timesliceMs || 100);
      this.maxPreRollChunks = Math.max(1, Math.ceil((this.options.preRollMs || 300) / slice));
      this.mediaRecorder.start(slice);
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

    // Chunked storage via timeslice for pre-roll and segmentation
    this.audioBlob = null;
    this.preRollChunks = [];
    this.activeChunks = [];
    this.vadActive = false;
    this.mediaRecorder.ondataavailable = (event) => {
      if (!event.data || event.data.size === 0) return;
      if (this.vadActive) {
        this.activeChunks.push(event.data);
      } else {
        // Maintain rolling pre-roll buffer
        this.preRollChunks.push(event.data);
        if (this.preRollChunks.length > this.maxPreRollChunks) {
          this.preRollChunks.shift();
        }
      }
    };

    this.mediaRecorder.onstop = () => {
      // If there's an active segment when stopped, finalize it
      if (this.activeChunks.length > 0) {
        this.finalizeActiveSegment();
      }
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

    // Create AudioContext and simplified filter chain
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Essential high-pass filter: cut low-frequency rumble at 80Hz
    this.highPassFilter = this.audioContext.createBiquadFilter();
    this.highPassFilter.type = 'highpass';
    this.highPassFilter.frequency.value = 80; // Hz (cut below ~80Hz)
    this.highPassFilter.Q.value = 0.8;

    // Simple speech band: add low-pass at ~4kHz (HPF + LPF ≈ bandpass with low complexity)
    this.lowPassFilter = this.audioContext.createBiquadFilter();
    this.lowPassFilter.type = 'lowpass';
    this.lowPassFilter.frequency.value = 4000; // Hz
    this.lowPassFilter.Q.value = 0.7;
    this.highPassFilter.connect(this.lowPassFilter);
    const lastFilterNode = this.lowPassFilter;

    // Analyser for energy monitoring with simplified settings
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0; // No smoothing - we'll handle it ourselves

    // Destination for MediaRecorder (record filtered audio)
    this.mediaStreamDestination = this.audioContext.createMediaStreamDestination();

    // Simplified graph: source -> HPF -> LPF -> analyser & destination
    sourceNode.connect(this.highPassFilter);
    lastFilterNode.connect(this.analyser);
    lastFilterNode.connect(this.mediaStreamDestination);

    // Expose filtered stream for recording
    this.filteredStream = this.mediaStreamDestination.stream;

    // Prepare data array and start monitoring
    this.dataArray = new Float32Array(this.analyser.fftSize);
    
    // Initialize baseline capture
    this.resetBaselineCapture();
    this.startEnergyMonitoring();
  }

  private resetBaselineCapture(): void {
    this.baselineEnergy = 0;
    this.baselineStartTime = Date.now();
    this.baselineCapturing = true;
    this.baselineEnergySum = 0;
    this.baselineEnergyCount = 0;
    console.log('[UniversalSTTRecorder] 🎯 Starting baseline energy capture for', this.options.baselineCaptureDuration, 'ms');
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
      
      // Handle baseline energy capture during first ~1 second
      const now = Date.now();
      if (this.baselineCapturing) {
        this.baselineEnergySum += rms;
        this.baselineEnergyCount++;
        
        if (now - this.baselineStartTime >= this.options.baselineCaptureDuration!) {
          this.baselineEnergy = this.baselineEnergySum / this.baselineEnergyCount;
          this.baselineCapturing = false;
          // Arm VAD slightly after baseline to avoid UI click/glitch triggers
          this.vadArmUntilTs = now + 250;
          console.log('[UniversalSTTRecorder] ✅ Baseline energy captured:', this.baselineEnergy.toFixed(6));
        }
      }
      
      // Smooth level changes for UI (prevent jittery animation)
      const rawLevel = Math.min(1, rms * 15);
      const smoothedLevel = lastLevel * 0.7 + rawLevel * 0.3;
      lastLevel = smoothedLevel;

      // Feed energy signal to animation
      this.options.onLevel?.(smoothedLevel);

      // Only run simplified VAD/silence detection while actively recording AND after baseline is captured
      if (this.isRecording && !this.baselineCapturing && this.baselineEnergy > 0) {
        const startThreshold = this.baselineEnergy * (1 + (this.options.triggerPercent || 0.2));
        const stopThreshold = this.baselineEnergy * (1 - this.options.silenceMargin!);
        
        if (!this.vadActive) {
          // Do not arm until after the guard window post-baseline
          if (Date.now() < this.vadArmUntilTs) {
            this.animationFrame = requestAnimationFrame(updateAnimation);
            return;
          }
          // Wait for a 20% jump above baseline to begin a segment
          if (rms > startThreshold) {
            this.beginActiveSegment();
          }
        } else {
          // While active, monitor for silence and hangover before finalizing
          const isSpeaking = rms > stopThreshold;
          if (!isSpeaking) {
            if (!this.silenceTimer) {
              this.silenceTimer = setTimeout(() => {
                console.log('[UniversalSTTRecorder] 🔇 Silence detected - finalizing segment');
                this.finalizeActiveSegment();
              }, this.options.silenceHangover);
            }
          } else {
            if (this.silenceTimer) {
              clearTimeout(this.silenceTimer);
              this.silenceTimer = null;
            }
          }
        }
      }

      this.animationFrame = requestAnimationFrame(updateAnimation);
    };

    updateAnimation(); // Start the energy monitoring loop
  }

  private beginActiveSegment(): void {
    // Seed active segment with pre-roll
    this.activeChunks = this.preRollChunks.slice();
    this.vadActive = true;
  }

  private finalizeActiveSegment(): void {
    if (!this.vadActive) return;
    this.vadActive = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    const chunks = this.activeChunks;
    this.activeChunks = [];
    if (!chunks || chunks.length === 0) return;
    // Ignore tiny segments (likely noise or click) to avoid empty conversation triggers
    const totalBytes = chunks.reduce((sum, b) => sum + b.size, 0);
    if (totalBytes < 5000) { // ~small blip
      return;
    }
    const blob = new Blob(chunks, { type: this.getSupportedMimeType() });
    // Signal processing start for UI
    try { this.options.onProcessingStart?.(); } catch {}
    // Send without blocking UI
    try {
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(() => { this.sendToSTT(blob).catch(() => {}); });
      } else {
        setTimeout(() => { this.sendToSTT(blob).catch(() => {}); }, 0);
      }
    } catch {
      setTimeout(() => { this.sendToSTT(blob).catch(() => {}); }, 0);
    }
  }

  private processRecording(): void {
    // Deprecated in chunked-mode. Left for compatibility if needed.
    if (this.audioBlob && this.audioBlob.size > 0) {
      const blob = this.audioBlob;
      this.audioBlob = null;
      try { this.options.onProcessingStart?.(); } catch {}
      try {
        if (typeof queueMicrotask === 'function') {
          queueMicrotask(() => { this.sendToSTT(blob).catch(() => {}); });
        } else {
          setTimeout(() => { this.sendToSTT(blob).catch(() => {}); }, 0);
        }
      } catch {
        setTimeout(() => { this.sendToSTT(blob).catch(() => {}); }, 0);
      }
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
    this.bandpassFilter = null;
    this.mediaStreamDestination = null;
    this.filteredStream = null;
    this.dataArray = null;
    this.mediaRecorder = null;
    this.audioBlob = null;
    this.preRollChunks = [];
    this.activeChunks = [];
    this.vadActive = false;
    
    // Reset baseline capture state
    this.baselineEnergy = 0;
    this.baselineCapturing = false;
    this.baselineEnergySum = 0;
    this.baselineEnergyCount = 0;
  }

  dispose(): void {
    this.stop();
    this.cleanup();
  }

  // Basic mobile device detection (runtime-only)
  private isMobileDevice(): boolean {
    if (typeof navigator === 'undefined' || typeof navigator.userAgent !== 'string') {
      return false;
    }
    const ua = navigator.userAgent;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  }
}