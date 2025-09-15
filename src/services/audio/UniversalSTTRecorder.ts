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
  voiceTriggeredStart?: boolean; // if true, only start collecting when voice detected
  preRollMs?: number; // amount of audio before trigger to include (default: 300ms)
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
  private bandpassFilter: BiquadFilterNode | null = null;
  private mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;
  private filteredStream: MediaStream | null = null;
  private mimeType: string = 'audio/webm';
  // Voice-trigger buffers
  private preRollChunks: Blob[] = [];
  private activeChunks: Blob[] = [];
  private preRollLimit: number = 3; // derived from preRollMs/timeslice
  private timesliceMs: number = 100;
  private voiceTriggeredActive: boolean = false;
  
  // Simplified VAD state
  private silenceTimer: NodeJS.Timeout | null = null;
  private isRecording = false;
  private options: STTRecorderOptions;
  private baselineEnergy: number = 0;
  private baselineStartTime: number = 0;
  private baselineCapturing = false;
  private baselineEnergySum = 0;
  private baselineEnergyCount = 0;

  constructor(options: STTRecorderOptions = {}) {
    this.options = {
      baselineCaptureDuration: 1000, // 1 second to capture baseline
      silenceMargin: 0.15, // 15% below baseline
      silenceHangover: 300, // 300ms before triggering silence
      enableBandpass: true, // enable human speech filter
      preRollMs: 300,
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
      
      // Step 4: Start recording
      // If voice-triggered start is enabled, record in timeslices to build pre-roll
      if (this.options.voiceTriggeredStart) {
        this.mediaRecorder!.start(this.timesliceMs);
      } else {
        this.mediaRecorder!.start();
      }
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
    this.mimeType = mimeType;
    // Configure pre-roll ring size
    this.preRollLimit = Math.max(1, Math.ceil((this.options.preRollMs || 300) / this.timesliceMs));

    // Single blob storage (not chunks)
    this.audioBlob = null;
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size === 0) return;
      if (this.options.voiceTriggeredStart) {
        // Before trigger: keep limited pre-roll ring buffer
        if (!this.voiceTriggeredActive) {
          this.preRollChunks.push(event.data);
          if (this.preRollChunks.length > this.preRollLimit) {
            this.preRollChunks.shift();
          }
        } else {
          // After trigger: collect active chunks
          this.activeChunks.push(event.data);
        }
      } else {
        // Default behavior: keep last data as single blob
        this.audioBlob = event.data;
      }
    };

    this.mediaRecorder.onstop = () => {
      // If voice-triggered, assemble pre-roll + active into one blob
      if (this.options.voiceTriggeredStart) {
        const chunks: Blob[] = [];
        if (this.preRollChunks.length) chunks.push(...this.preRollChunks);
        if (this.activeChunks.length) chunks.push(...this.activeChunks);
        if (chunks.length) {
          this.audioBlob = new Blob(chunks, { type: this.mimeType });
        } else {
          // Fallback to last chunk if available
          if (!this.audioBlob) this.audioBlob = new Blob([], { type: this.mimeType });
        }
        // Reset buffers
        this.preRollChunks = [];
        this.activeChunks = [];
        this.voiceTriggeredActive = false;
      }
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

    // Create AudioContext and simplified filter chain
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Essential high-pass filter: cut low-frequency rumble at 80Hz
    this.highPassFilter = this.audioContext.createBiquadFilter();
    this.highPassFilter.type = 'highpass';
    this.highPassFilter.frequency.value = 80; // Hz (cut below ~80Hz)
    this.highPassFilter.Q.value = 0.8;

    // Optional bandpass filter for human speech (100-4000Hz)
    let lastFilterNode = this.highPassFilter;
    if (this.options.enableBandpass) {
      this.bandpassFilter = this.audioContext.createBiquadFilter();
      this.bandpassFilter.type = 'bandpass';
      this.bandpassFilter.frequency.value = 2050; // Center frequency for 100-4000Hz range
      this.bandpassFilter.Q.value = 0.5; // Moderate Q for speech range
      this.highPassFilter.connect(this.bandpassFilter);
      lastFilterNode = this.bandpassFilter;
    }

    // Analyser for energy monitoring with simplified settings
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0; // No smoothing - we'll handle it ourselves

    // Destination for MediaRecorder (record filtered audio)
    this.mediaStreamDestination = this.audioContext.createMediaStreamDestination();

    // Simplified graph: source -> HPF -> [optional bandpass] -> analyser & destination
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
    let armed = false;
    let speechAccumMs = 0;
    let lastTs = performance.now();
    let triggered = false;
    let rmsEma = 0;
    const rmsAlpha = 0.15;
    
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
      rmsEma = rmsEma * (1 - rmsAlpha) + rms * rmsAlpha;
      
      // Handle baseline energy capture during first ~1 second
      const now = Date.now();
      if (this.baselineCapturing) {
        this.baselineEnergySum += rms;
        this.baselineEnergyCount++;
        
        if (now - this.baselineStartTime >= this.options.baselineCaptureDuration!) {
          this.baselineEnergy = this.baselineEnergySum / this.baselineEnergyCount;
          this.baselineCapturing = false;
          console.log('[UniversalSTTRecorder] ✅ Baseline energy captured:', this.baselineEnergy.toFixed(6));
        }
      }
      
      // Smooth level changes for UI (prevent jittery animation)
      const rawLevel = Math.min(1, rms * 15);
      const smoothedLevel = lastLevel * 0.7 + rawLevel * 0.3;
      lastLevel = smoothedLevel;

      // Feed energy signal to animation
      this.options.onLevel?.(smoothedLevel);

      // Only run VAD while actively recording AND after baseline is captured
      if (this.isRecording && !this.baselineCapturing && this.baselineEnergy > 0) {
        // Dynamic threshold: baseline energy × (1 - margin)
        const dynamicThreshold = this.baselineEnergy * (1 - this.options.silenceMargin!);
        // Simple ZCR
        let crossings = 0;
        for (let i = 1; i < this.dataArray.length; i++) {
          const a = this.dataArray[i - 1];
          const b = this.dataArray[i];
          if (a * b < 0 && (Math.abs(a) > 0.01 || Math.abs(b) > 0.01)) crossings++;
        }
        const zcr = crossings / (this.dataArray.length - 1);
        const candidate = (rmsEma > dynamicThreshold) && (zcr >= 0.05 && zcr <= 0.25);
        
        // Log occasionally for debugging
        if (Math.random() < 0.01) {
          console.log('[UniversalSTTRecorder] rmsEma:', rmsEma.toFixed(6), 'thr:', dynamicThreshold.toFixed(6), 'zcr:', zcr.toFixed(3), 'cand:', candidate, 'trig:', triggered);
        }
        // Arming delay before trigger
        const nowTs = performance.now();
        const dt = Math.max(0, nowTs - lastTs);
        lastTs = nowTs;
        if (!armed) {
          speechAccumMs += dt;
          if (speechAccumMs >= 300) { armed = true; speechAccumMs = 0; }
        }

        if (armed && !triggered && this.options.voiceTriggeredStart) {
          if (candidate) {
            speechAccumMs += dt;
            if (speechAccumMs >= 250) {
              // Trigger: start collecting main chunks
              triggered = true;
              this.voiceTriggeredActive = true;
            }
          } else {
            speechAccumMs = 0;
          }
        }

        // Silence handling only after trigger (or if voiceTriggeredStart is off)
        const allowSilence = !this.options.voiceTriggeredStart || triggered;
        if (allowSilence) {
          if (!candidate) {
            if (!this.silenceTimer) {
              this.silenceTimer = setTimeout(() => {
                console.log('[UniversalSTTRecorder] 🔇 Silence detected - stopping recording');
                this.stop();
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
    this.bandpassFilter = null;
    this.mediaStreamDestination = null;
    this.filteredStream = null;
    this.dataArray = null;
    this.mediaRecorder = null;
    this.audioBlob = null;
    
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