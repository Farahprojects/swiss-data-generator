// Simplified audio pipeline - no heavy processing

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
  private analyserNode: AnalyserNode | null = null;
  private levelMonitorTimer: number | null = null;

  constructor(events: ConversationAudioEvents = {}) {
    this.events = events;
  }

  public async init(): Promise<void> {
    if (this.audioContext) return;
    try {
      console.log('[ConversationAudioPipeline] Creating AudioContext...');
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ 
        sampleRate: 16000, 
        latencyHint: 'interactive' as any 
      });
      console.log('[ConversationAudioPipeline] AudioContext created:', this.audioContext.state);
      
      console.log('[ConversationAudioPipeline] Adding audio worklet module...');
      const workletUrl = new URL('../../workers/audio/ConversationAudioProcessor.js', import.meta.url);
      console.log('[ConversationAudioPipeline] Worklet URL:', workletUrl.href);
      await this.audioContext.audioWorklet.addModule(workletUrl);
      console.log('[ConversationAudioPipeline] Audio worklet module added');
      
      console.log('[ConversationAudioPipeline] Creating worker...');
      this.worker = new Worker(new URL('../../workers/audio/conversation-audio-worker.js', import.meta.url));
      console.log('[ConversationAudioPipeline] Worker created');

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

    } catch (e: any) {
      console.error('[ConversationAudioPipeline] Init failed:', e);
      this.events.onError?.(e);
      throw e;
    }
  }

  public async start(): Promise<void> {
    if (!this.audioContext) await this.init();
    if (!this.audioContext) throw new Error('AudioContext unavailable');
    if (this.started) return;

    try {
      console.log('[ConversationAudioPipeline] Requesting microphone access...');
      console.log('[ConversationAudioPipeline] MediaDevices available:', !!navigator.mediaDevices);
      console.log('[ConversationAudioPipeline] getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
      
      // Check permissions first
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log('[ConversationAudioPipeline] Microphone permission state:', permission.state);
        } catch (permError) {
          console.log('[ConversationAudioPipeline] Permission query failed:', permError);
        }
      }
      
      // Simple audio constraints - let browser handle processing
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
          sampleRate: 16000
        },
        video: false
      });
      console.log('[ConversationAudioPipeline] Microphone access granted');

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'conversation-audio-processor');

      // Simple analyser for level monitoring
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Direct connection: source -> analyser -> worklet
      source.connect(this.analyserNode);
      this.analyserNode.connect(this.workletNode);

      // Prevent feedback: route to zero-gain node
      const sinkMuteGain = this.audioContext.createGain();
      sinkMuteGain.gain.value = 0;
      this.workletNode.connect(sinkMuteGain);
      sinkMuteGain.connect(this.audioContext.destination);

      // Start simple level monitoring
      this.startLevelMonitor();

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
    if (this.workletNode) {
      this.workletNode.port.onmessage = null as any;
    }
  }

  public resume(): void {
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
      if (this.levelMonitorTimer) {
        clearInterval(this.levelMonitorTimer);
        this.levelMonitorTimer = null;
      }
      this.analyserNode = null;

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
    } catch {}
  }

  public dispose(): void {
    this.stop();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.started = false;
  }

  // Simple level monitoring - no AGC
  private startLevelMonitor(): void {
    if (!this.analyserNode) return;
    if (this.levelMonitorTimer) return;

    const analyser = this.analyserNode;
    const buffer = new Float32Array(analyser.fftSize);

    this.levelMonitorTimer = window.setInterval(() => {
      try {
        analyser.getFloatTimeDomainData(buffer);
        // Simple RMS calculation
        let sumSq = 0;
        for (let i = 0; i < buffer.length; i++) {
          const s = buffer[i];
          sumSq += s * s;
        }
        const rms = Math.sqrt(sumSq / buffer.length) || 0.000001;
        const level = Math.min(1, rms * 10); // Simple scaling
        this.events.onLevel?.(level);
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