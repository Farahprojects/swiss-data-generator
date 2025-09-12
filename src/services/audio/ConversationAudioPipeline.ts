// High-level service that wires AudioWorklet and WebWorker for Conversation Mode

export type ConversationAudioEvents = {
  onSpeechStart?: () => void;
  onSpeechSegment?: (float32Pcm: Float32Array) => void;
  onLevel?: (level01: number) => void;
  onError?: (error: Error) => void;
};

export class ConversationAudioPipeline {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private worker: Worker | null = null;
  private started: boolean = false;
  private events: ConversationAudioEvents;
  private isBackground: boolean = false;
  private backgroundThrottleInterval: number | null = null;
  // Adaptive gain control chain
  private agcGainNode: GainNode | null = null;
  private limiterNode: DynamicsCompressorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private agcMonitorTimer: number | null = null;
  private currentAgcGain: number = 1.0;

  // Android Chrome detection for mobile-specific tuning
  private isAndroidChrome(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /Android/i.test(ua) && /Chrome\/\d+/i.test(ua) && /Mobile/i.test(ua);
  }

  constructor(events: ConversationAudioEvents = {}) {
    this.events = events;
    // Slightly higher initial gain on Android Chrome for better pickup
    if (this.isAndroidChrome()) {
      this.currentAgcGain = 1.6; // ~+4 dB start; AGC monitor will adapt
    }
  }

  public async init(): Promise<void> {
    if (this.audioContext) return;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000, latencyHint: 'interactive' as any });
      await this.audioContext.audioWorklet.addModule(new URL('../../workers/audio/ConversationAudioProcessor.js', import.meta.url));
      this.worker = new Worker(new URL('../../workers/audio/conversation-audio-worker.js', import.meta.url));

      this.worker.onmessage = (evt: MessageEvent) => {
        const { type } = evt.data || {};
        if (type === 'vad' && evt.data.state === 'speech_start') {
          this.events.onSpeechStart?.();
        } else if (type === 'segment' && evt.data.buffer) {
          const pcm = new Float32Array(evt.data.buffer);
          this.events.onSpeechSegment?.(pcm);
        } else if (type === 'level') {
          this.events.onLevel?.(evt.data.value ?? 0);
        }
      };
      // Mobile visibility handling: ensure context resumes on return + background throttling
      const handleVisibility = () => {
        if (!this.audioContext) return;
        
        if (document.visibilityState === 'visible') {
          // App became visible - resume context and stop background throttling
          if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
          }
          this.isBackground = false;
          this.stopBackgroundThrottling();
        } else {
          // App went to background - start throttling
          this.isBackground = true;
          this.startBackgroundThrottling();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      // Store remover on the instance for cleanup
      (this as any)._removeVisibility = () => document.removeEventListener('visibilitychange', handleVisibility);

    } catch (e: any) {
      this.events.onError?.(e);
      throw e;
    }
  }

  public async start(): Promise<void> {
    if (!this.audioContext) await this.init();
    if (!this.audioContext) throw new Error('AudioContext unavailable');
    if (this.started) return;

    try {
      // Base constraints
      const baseAudio: MediaTrackConstraints = {
        channelCount: 1,
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: false,
        sampleRate: 48000
      };
      // Android Chrome: rely on browser AGC + NS, reduces missed speech on mobile mics
      const audioConstraints: MediaTrackConstraints = this.isAndroidChrome()
        ? ({
            ...baseAudio,
            autoGainControl: true,
            // Hints recognized by Chromium; safe to include as optional
            // @ts-ignore
            googAutoGainControl: true,
            // @ts-ignore
            googNoiseSuppression: true
          } as any)
        : baseAudio;

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false
      });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'conversation-audio-processor');

      // Adaptive Gain Control (AGC): source -> agcGain -> limiter -> worklet
      this.agcGainNode = this.audioContext.createGain();
      this.agcGainNode.gain.value = this.currentAgcGain;

      // Hard limiter to prevent clipping from sudden peaks
      this.limiterNode = this.audioContext.createDynamicsCompressor();
      this.limiterNode.threshold.setValueAtTime(-3, this.audioContext.currentTime); // dB
      this.limiterNode.knee.setValueAtTime(0, this.audioContext.currentTime);
      this.limiterNode.ratio.setValueAtTime(20, this.audioContext.currentTime);
      this.limiterNode.attack.setValueAtTime(0.003, this.audioContext.currentTime);
      this.limiterNode.release.setValueAtTime(0.05, this.audioContext.currentTime);

      // Analyser for RMS metering (monitor post-gain, pre-limiter)
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 1024;
      // Slightly more smoothing on Android Chrome to stabilize mobile level flicker
      this.analyserNode.smoothingTimeConstant = this.isAndroidChrome() ? 0.85 : 0.8;

      source.connect(this.agcGainNode);
      this.agcGainNode.connect(this.analyserNode);
      this.agcGainNode.connect(this.limiterNode);
      this.limiterNode.connect(this.workletNode);

      // Prevent feedback: route to a zero-gain node instead of speakers
      const sinkMuteGain = this.audioContext.createGain();
      sinkMuteGain.gain.value = 0;
      this.workletNode.connect(sinkMuteGain);
      sinkMuteGain.connect(this.audioContext.destination);

      // Start AGC monitor loop (RMS-based, attack/release smoothing)
      this.startAgcMonitor();

      // Forward frames from worklet to worker
      this.workletNode.port.onmessage = (event: MessageEvent) => {
        const { type, buffer } = event.data || {};
        if (type === 'audio' && buffer && this.worker) {
          this.worker.postMessage({ type: 'audio', buffer }, [buffer]);
        }
      };

      this.started = true;
    } catch (e: any) {
      this.events.onError?.(e);
      throw e;
    }
  }

  public pause(): void {
    // Keep media stream and AudioContext active, just stop forwarding to WebWorker
    if (this.workletNode) {
      this.workletNode.port.onmessage = null as any;
    }
  }

  public resume(): void {
    // Restart forwarding to WebWorker
    if (this.workletNode) {
      this.workletNode.port.onmessage = (event: MessageEvent) => {
        const { type, buffer } = event.data || {};
        if (type === 'audio' && buffer && this.worker) {
          this.worker.postMessage({ type: 'audio', buffer }, [buffer]);
        }
      };
    }
  }

  public async stop(): Promise<void> {
    try {
      // Stop AGC monitor
      if (this.agcMonitorTimer) {
        clearInterval(this.agcMonitorTimer);
        this.agcMonitorTimer = null;
      }
      this.analyserNode = null;
      this.limiterNode = null;
      this.agcGainNode = null;

      if (this.workletNode) {
        this.workletNode.port.onmessage = null as any;
        this.workletNode.disconnect();
        this.workletNode = null;
      }
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(t => t.stop());
        this.mediaStream = null;
      }
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }
      // Remove visibility listener if present
      if ((this as any)._removeVisibility) {
        try { (this as any)._removeVisibility(); } catch {}
        (this as any)._removeVisibility = null;
      }
    } catch {}
  }

  private startBackgroundThrottling(): void {
    if (this.backgroundThrottleInterval) return;
    
    // Throttle processing to 50% frequency when in background
    this.backgroundThrottleInterval = window.setInterval(() => {
      if (this.worker && this.isBackground) {
        // Send a throttle signal to worker
        this.worker.postMessage({ type: 'throttle', enabled: true });
      }
    }, 100); // Check every 100ms
  }

  private stopBackgroundThrottling(): void {
    if (this.backgroundThrottleInterval) {
      clearInterval(this.backgroundThrottleInterval);
      this.backgroundThrottleInterval = null;
    }
    
    // Tell worker to stop throttling
    if (this.worker) {
      this.worker.postMessage({ type: 'throttle', enabled: false });
    }
  }

  public dispose(): void {
    this.stop();
    this.stopBackgroundThrottling();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.started = false;
  }

  // --- AGC Implementation ---------------------------------------------------
  private startAgcMonitor(): void {
    if (!this.audioContext || !this.analyserNode || !this.agcGainNode) return;
    if (this.agcMonitorTimer) return;

    const analyser = this.analyserNode;
    const gainNode = this.agcGainNode;
    const ctx = this.audioContext;
    const buffer = new Float32Array(analyser.fftSize);

    // Target loudness and bounds
    const targetRms = 0.18; // ~ -15 dBFS
    const minGain = 0.5;    // -6 dB min
    const maxGain = 8.0;    // +18 dB max

    // Time constants (seconds)
    const attackTc = 0.05;  // speed up when too quiet
    const releaseTc = 0.25; // slow down when too loud

    this.agcMonitorTimer = window.setInterval(() => {
      try {
        analyser.getFloatTimeDomainData(buffer);
        // Compute RMS
        let sumSq = 0;
        for (let i = 0; i < buffer.length; i++) {
          const s = buffer[i];
          sumSq += s * s;
        }
        const rms = Math.sqrt(sumSq / buffer.length) || 0.000001;

        // Desired gain to reach target
        let desired = targetRms / rms;
        desired = Math.min(Math.max(desired, minGain), maxGain);

        // Choose time constant based on direction (faster up than down)
        const tc = desired > this.currentAgcGain ? attackTc : releaseTc;

        // Smoothly approach desired gain
        const now = ctx.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setTargetAtTime(desired, now, tc);
        this.currentAgcGain = desired;
      } catch {}
    }, 50); // 20 Hz updates
  }
}

export function encodeWav16kMono(pcm: Float32Array, sampleRate: number = 16000): Blob {
  const numFrames = pcm.length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = 1 * bytesPerSample; // mono
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // PCM samples
  floatTo16BitPCM(view, 44, pcm);

  return new Blob([view], { type: 'audio/wav' });

  function writeString(dv: DataView, offset: number, s: string) {
    for (let i = 0; i < s.length; i++) dv.setUint8(offset + i, s.charCodeAt(i));
  }
  function floatTo16BitPCM(dv: DataView, offset: number, input: Float32Array) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      dv.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  }
}


