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

  constructor(events: ConversationAudioEvents = {}) {
    this.events = events;
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
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          noiseSuppression: false,
          echoCancellation: false,
          autoGainControl: false,
          sampleRate: 48000
        },
        video: false
      });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'conversation-audio-processor');
      // Prevent feedback: route to a zero-gain node instead of speakers
      const gain = this.audioContext.createGain();
      gain.gain.value = 0;
      source.connect(this.workletNode);
      this.workletNode.connect(gain);
      gain.connect(this.audioContext.destination);

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


