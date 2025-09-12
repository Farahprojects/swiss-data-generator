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
  private startupWatchdogTimer: number | null = null;
  private _removeVisibility?: () => void;
  private _removeDeviceChange?: () => void;
  private rawAnalyserNode: AnalyserNode | null = null;
  private rawLevelTimer: number | null = null;
  private driftMonitorTimer: number | null = null;

  constructor(events: ConversationAudioEvents = {}) {
    this.events = events;
  }

  public async init(): Promise<void> {
    if (this.audioContext) return;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000, latencyHint: 'interactive' as any });
      try { performance.mark('worklet.addModule.start'); } catch {}
      await this.audioContext.audioWorklet.addModule(new URL('../../workers/audio/ConversationAudioProcessor.js', import.meta.url));
      try { performance.mark('worklet.addModule.end'); } catch {}
      this.worker = new Worker(new URL('../../workers/audio/conversation-audio-worker.js', import.meta.url));

      this.worker.onmessage = (evt: MessageEvent) => {
        const { type } = evt.data || {};
        if (type === 'vad' && evt.data.state === 'speech_start') {
          this.events.onSpeechStart?.();
        } else if (type === 'segment' && evt.data.buffer) {
          const pcm = new Float32Array(evt.data.buffer);
          this.events.onSpeechSegment?.(pcm);
        } else if (type === 'level') {
          // UI level is driven by analyser (post-AGC) for smooth, consistent animation.
          // Ignore worker-provided level to avoid double updates.
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
          // Freshen VAD/ring upon foreground to avoid stale segments
          try {
            this.worker?.postMessage({ type: 'reset' });
            this.worker?.postMessage({ type: 'barrier_open' });
          } catch {}
        } else {
          // App went to background - start throttling
          this.isBackground = true;
          this.startBackgroundThrottling();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      this._removeVisibility = () => document.removeEventListener('visibilitychange', handleVisibility);

      // Device change handling
      const handleDeviceChange = async () => {
        try {
          if (!this.started) return;
          await this.rebindInputStream();
          // AEC warmup while device settles and request worker recalibration
          try { this.aecWarmup(400); } catch {}
          try { this.worker?.postMessage({ type: 'recalibrate' }); } catch {}
          // Non-blocking baseline recalibration to re-lock AGC under new device/DSP
          try { this.calibrateBaselineAndLock(); } catch {}
        } catch {}
      };
      try {
        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange as any);
        this._removeDeviceChange = () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange as any);
      } catch {}

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
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          // Capture with clean front-end processing; AGC handled in-app
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: false,
          sampleRate: 48000
        },
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

      // Raw analyser (pre-AGC) for baseline + UI energy
      this.rawAnalyserNode = this.audioContext.createAnalyser();
      this.rawAnalyserNode.fftSize = 1024;
      this.rawAnalyserNode.smoothingTimeConstant = 0.8;

      // Post-AGC analyser can remain for debug but will not drive logic
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 1024;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Branch: Source -> rawAnalyser (tap)
      source.connect(this.rawAnalyserNode);
      // Branch: Source -> AGC -> analyser -> limiter -> worklet
      source.connect(this.agcGainNode);
      this.agcGainNode.connect(this.analyserNode);
      this.agcGainNode.connect(this.limiterNode);
      this.limiterNode.connect(this.workletNode);

      // Prevent feedback: route to a zero-gain node instead of speakers
      const sinkMuteGain = this.audioContext.createGain();
      sinkMuteGain.gain.value = 0;
      this.workletNode.connect(sinkMuteGain);
      sinkMuteGain.connect(this.audioContext.destination);

      // Ensure fresh state: reset worker VAD/ring buffer before streaming
      try { this.worker?.postMessage({ type: 'reset' }); } catch {}

      // Start raw energy/UI level monitor (no dynamic AGC adjustment)
      this.startRawLevelMonitor();

      // Calibrate baseline and lock AGC + worker VAD threshold
      await this.calibrateBaselineAndLock();

      // Forward frames from worklet to worker
      this.workletNode.port.onmessage = (event: MessageEvent) => {
        const { type, buffer } = event.data || {};
        if (type === 'audio' && buffer && this.worker) {
          this.worker.postMessage({ type: 'audio', buffer }, [buffer]);
        } else if (type === 'calibration_done') {
          try { window.dispatchEvent(new CustomEvent('telemetry', { detail: { key: 'calibration.done', t: performance.now(), baseline: event.data?.baseline } })); } catch {}
        } else if (type === 'recalibrate_needed') {
          try { window.dispatchEvent(new CustomEvent('telemetry', { detail: { key: 'recalibrate.requested', t: performance.now() } })); } catch {}
        }
      };

      // Start-up barrier and watchdog
      try { this.worker?.postMessage({ type: 'barrier_open' }); } catch {}
      this.startStartupWatchdog();

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
        } else if (type === 'calibration_done') {
          try { window.dispatchEvent(new CustomEvent('telemetry', { detail: { key: 'calibration.done', t: performance.now(), baseline: event.data?.baseline } })); } catch {}
        } else if (type === 'recalibrate_needed') {
          try { window.dispatchEvent(new CustomEvent('telemetry', { detail: { key: 'recalibrate.requested', t: performance.now() } })); } catch {}
        }
      };
    }
  }

  public async stop(): Promise<void> {
    try {
      // Stop monitors
      if (this.agcMonitorTimer) { clearInterval(this.agcMonitorTimer); this.agcMonitorTimer = null; }
      if (this.rawLevelTimer) { clearInterval(this.rawLevelTimer); this.rawLevelTimer = null; }
      if (this.driftMonitorTimer) { clearInterval(this.driftMonitorTimer); this.driftMonitorTimer = null; }
      if (this.startupWatchdogTimer) {
        clearTimeout(this.startupWatchdogTimer);
        this.startupWatchdogTimer = null;
      }
      this.analyserNode = null;
      this.rawAnalyserNode = null;
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
      if (this._removeVisibility) { try { this._removeVisibility(); } catch {} this._removeVisibility = undefined; }
      if (this._removeDeviceChange) { try { this._removeDeviceChange(); } catch {} this._removeDeviceChange = undefined; }
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

  // --- Raw energy monitor (pre-AGC) -----------------------------------------
  private startRawLevelMonitor(): void {
    if (!this.audioContext || !this.rawAnalyserNode) return;
    if (this.rawLevelTimer) return;

    const analyser = this.rawAnalyserNode;
    const buffer = new Float32Array(analyser.fftSize);

    this.rawLevelTimer = window.setInterval(() => {
      try {
        analyser.getFloatTimeDomainData(buffer);
        let sumSq = 0;
        for (let i = 0; i < buffer.length; i++) {
          const s = buffer[i];
          sumSq += s * s;
        }
        const rms = Math.sqrt(sumSq / buffer.length) || 0.000001;
        // Drive UI from raw RMS only
        const uiLevel = Math.min(1, rms * 6);
        this.events.onLevel?.(uiLevel);
      } catch {}
    }, 50);
  }

  // Calibrate baseline from raw analyser, lock AGC and inform worker
  private async calibrateBaselineAndLock(): Promise<void> {
    if (!this.audioContext || !this.rawAnalyserNode || !this.agcGainNode) return;
    const analyser = this.rawAnalyserNode;
    const buffer = new Float32Array(analyser.fftSize);
    const sampleWindows = 30; // ~1.5s at 50ms
    let energySum = 0;
    let frames = 0;

    await new Promise<void>((resolve) => {
      const timer = window.setInterval(() => {
        try {
          analyser.getFloatTimeDomainData(buffer);
          let sumSq = 0;
          for (let i = 0; i < buffer.length; i++) {
            const s = buffer[i];
            sumSq += s * s;
          }
          const energy = sumSq / buffer.length;
          energySum += energy;
          frames++;
          if (frames >= sampleWindows) {
            clearInterval(timer);
            resolve();
          }
        } catch {
          clearInterval(timer);
          resolve();
        }
      }, 50);
    });

    const avgEnergy = energySum / Math.max(1, frames);
    const noiseRms = Math.sqrt(Math.max(avgEnergy, 1e-9));

    // Lock AGC once based on baseline (no continuous adjustment)
    const targetRms = 0.18; // desired operating point
    const minGain = 0.5;
    const maxGain = 8.0;
    const desired = Math.min(Math.max(targetRms / Math.max(noiseRms, 1e-6), minGain), maxGain);
    const now = this.audioContext.currentTime;
    this.agcGainNode.gain.cancelScheduledValues(now);
    this.agcGainNode.gain.setValueAtTime(desired, now);
    this.currentAgcGain = desired;

    // Inform worker to lock VAD threshold via recalibration path
    try { this.worker?.postMessage({ type: 'recalibrate' }); } catch {}
  }

  // --- Startup watchdog ------------------------------------------------------
  private startStartupWatchdog(): void {
    if (this.startupWatchdogTimer) return;
    // If we don't see any segment callback within 2s, nudge the worker to reset
    this.startupWatchdogTimer = window.setTimeout(() => {
      try { this.worker?.postMessage({ type: 'reset' }); this.worker?.postMessage({ type: 'barrier_open' }); } catch {}
      this.startupWatchdogTimer = null;
    }, 2000);

    // Clear watchdog on first segment
    if (this.workletNode) {
      const original = this.workletNode.port.onmessage;
      this.workletNode.port.onmessage = (event: MessageEvent) => {
        if (event.data?.type === 'segment' && this.startupWatchdogTimer) {
          clearTimeout(this.startupWatchdogTimer);
          this.startupWatchdogTimer = null;
        }
        // Forward to existing handler
        if (typeof original === 'function') {
          (original as any)(event);
        }
      } as any;
    }
  }

  private async rebindInputStream(): Promise<void> {
    if (!this.audioContext) return;
    try {
      // Stop old tracks and source
      if (this.mediaStream) {
        try { this.mediaStream.getTracks().forEach(t => t.stop()); } catch {}
        this.mediaStream = null;
      }
      // Acquire new default device stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: false,
          sampleRate: 48000
        },
        video: false
      });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      if (this.agcGainNode) {
        source.connect(this.agcGainNode);
      }
    } catch {}
  }

  // AEC warmup hint for far-end playback start or device change
  public aecWarmup(ms: number = 400): void {
    try { this.worker?.postMessage({ type: 'aec_warmup', ms }); } catch {}
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


