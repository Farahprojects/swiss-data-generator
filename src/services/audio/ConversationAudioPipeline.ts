// High-level service that wires AudioWorklet and WebWorker for Conversation Mode

export type ConversationAudioEvents = {
  onSpeechStart?: () => void;
  onSpeechSegment?: (float32Pcm: Float32Array) => void;
  onError?: (error: Error) => void;
};

export class ConversationAudioPipeline {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private worker: Worker | null = null;
  private started: boolean = false;
  private events: ConversationAudioEvents;

  constructor(events: ConversationAudioEvents = {}) {
    this.events = events;
  }

  public async init(): Promise<void> {
    if (this.audioContext) return;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });
      await this.audioContext.audioWorklet.addModule(new URL('../../workers/audio/ConversationAudioProcessor.js', import.meta.url));
      this.worker = new Worker(new URL('../../workers/audio/conversation-audio-worker.js', import.meta.url));

      this.worker.onmessage = (evt: MessageEvent) => {
        const { type } = evt.data || {};
        if (type === 'vad' && evt.data.state === 'speech_start') {
          this.events.onSpeechStart?.();
        } else if (type === 'segment' && evt.data.buffer) {
          const pcm = new Float32Array(evt.data.buffer);
          this.events.onSpeechSegment?.(pcm);
        }
      };
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
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 }, video: false });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'conversation-audio-processor');
      source.connect(this.workletNode).connect(this.audioContext.destination);

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
    if (this.audioContext?.state === 'running') this.audioContext.suspend();
  }

  public resume(): void {
    if (this.audioContext?.state === 'suspended') this.audioContext.resume();
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


