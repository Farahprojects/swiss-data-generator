/**
 * 🎯 ROLLING BUFFER VAD - Team's Clean Implementation
 * 
 * Professional rolling buffer VAD implementation based on team's proven approach.
 * Uses index-based selection, no timestamps, proper memory management.
 */

export interface RollingBufferVADOptions {
  // Buffering and chunking
  lookbackWindowMs?: number;   // default 15000
  chunkDurationMs?: number;    // default 200 (>=100)
  preRollMs?: number;          // default 250
  pruneOnUtterance?: boolean;  // default true

  // VAD thresholds and timings (RMS on analyser)
  voiceThreshold?: number;     // default 0.012
  silenceThreshold?: number;   // default 0.008
  voiceConfirmMs?: number;     // default 300
  silenceTimeoutMs?: number;   // default 1500
  maxUtteranceMs?: number;     // default 15000
  minUtteranceMs?: number;     // default 250

  // Lifecycle
  onVoiceStart?: () => void;
  onUtterance?: (blob: Blob) => void;
  onSilenceDetected?: (blob?: Blob) => void; // back-compat: fires same blob as onUtterance
  onError?: (error: Error) => void;
}

export interface RollingBufferVADState {
  audioLevel: number;
  isSpeaking: boolean;
}

type AudioChunk = Blob;

export class RollingBufferVAD {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private monitorTimer: number | null = null;

  private stream: MediaStream | null = null;
  private chunks: AudioChunk[] = [];
  private utteranceStartIndex: number | null = null;
  private utteranceStartWallMs: number | null = null;

  private opts: Required<RollingBufferVADOptions>;
  private state: RollingBufferVADState = { audioLevel: 0, isSpeaking: false };

  constructor(options: RollingBufferVADOptions = {}) {
    this.opts = {
      lookbackWindowMs: 15000,
      chunkDurationMs: 160,
      preRollMs: 250,
      pruneOnUtterance: true,

      voiceThreshold: 0.005, // More sensitive for speech start
      silenceThreshold: 0.001, // More sensitive for silence detection
      voiceConfirmMs: 200,
      silenceTimeoutMs: 1000,
      maxUtteranceMs: 15000,
      minUtteranceMs: 250,

      onVoiceStart: () => {},
      onUtterance: () => {},
      onSilenceDetected: () => {},
      onError: () => {},
      ...options,
    };
  }

  getState(): RollingBufferVADState {
    return { ...this.state };
  }

  async start(stream: MediaStream, mediaRecorder: MediaRecorder, audioContext?: AudioContext): Promise<void> {
    this.cleanup();
    this.stream = stream;

    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    this.audioContext = audioContext ?? new AC();
    this.sourceNode = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024;
    this.sourceNode.connect(this.analyser);

    this.mediaRecorder = mediaRecorder;

    const chunkMs = Math.max(100, this.opts.chunkDurationMs);
    const maxChunks = Math.max(1, Math.ceil(this.opts.lookbackWindowMs / chunkMs));
    const preRollChunks = Math.max(0, Math.ceil(this.opts.preRollMs / chunkMs));

    this.mediaRecorder.ondataavailable = (evt) => {
      if (evt.data && evt.data.size > 0) {
        this.chunks.push(evt.data);
        while (this.chunks.length > maxChunks) this.chunks.shift();
      }
    };

    this.mediaRecorder.onerror = (evt: any) => {
      this.opts.onError(new Error(evt?.error?.message || 'MediaRecorder error'));
    };

    try {
      this.mediaRecorder.start(chunkMs);
    } catch {
      // fallback: no timeslice
      try {
        this.mediaRecorder.start();
      } catch (e: any) {
        this.opts.onError(new Error('Unable to start MediaRecorder'));
        throw e;
      }
    }

    this.startMonitoring({ chunkMs, preRollChunks });
  }

  stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const finalize = () => {
        const mime = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = this.chunks.length ? new Blob(this.chunks, { type: mime }) : null;
        this.cleanup();
        resolve(blob);
      };

      try {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          const mr = this.mediaRecorder;
          mr.addEventListener('stop', () => setTimeout(finalize, 10), { once: true });
          mr.stop();
        } else {
          setTimeout(finalize, 10);
        }
      } catch {
        setTimeout(finalize, 10);
      }
    });
  }

  cleanup(): void {
    if (this.monitorTimer !== null) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
    if (this.mediaRecorder) {
      try { if (this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop(); } catch {}
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onerror = null;
      this.mediaRecorder = null;
    }
    try {
      this.sourceNode?.disconnect();
      this.analyser?.disconnect();
    } catch {}
    this.sourceNode = null;
    this.analyser = null;
    this.audioContext = null;

    this.chunks = [];
    this.utteranceStartIndex = null;
    this.utteranceStartWallMs = null;
    this.state = { audioLevel: 0, isSpeaking: false };
  }

  // Internal

  private startMonitoring(cfg: { chunkMs: number; preRollChunks: number }) {
    if (!this.analyser) return;
    const analyser = this.analyser;
    const bufLen = analyser.fftSize;
    const data = new Uint8Array(bufLen);

    let voiceStartWall: number | null = null;
    let silenceStartWall: number | null = null;

    const sampleEveryMs = 40;
    this.monitorTimer = window.setInterval(() => {
      try {
        if (!this.analyser) return;

        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < bufLen; i++) {
          const centered = (data[i] - 128) / 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / bufLen);
        this.state.audioLevel = rms;

        const now = Date.now();
        const {
          voiceThreshold,
          silenceThreshold,
          voiceConfirmMs,
          silenceTimeoutMs,
          maxUtteranceMs,
        } = this.opts;

        if (!this.state.isSpeaking) {
          if (rms > voiceThreshold) {
            if (voiceStartWall == null) voiceStartWall = now;
            if (now - voiceStartWall >= voiceConfirmMs) {
              this.state.isSpeaking = true;
              this.utteranceStartWallMs = now;
              this.utteranceStartIndex = Math.max(0, this.chunks.length - cfg.preRollChunks);
              voiceStartWall = null;
              silenceStartWall = null;
              try { this.opts.onVoiceStart(); } catch {}
            }
          } else {
            voiceStartWall = null;
          }
          return;
        }

        // speaking
        const elapsed = this.utteranceStartWallMs ? now - this.utteranceStartWallMs : 0;

        if (rms < silenceThreshold) {
          if (silenceStartWall == null) silenceStartWall = now;
          if (now - silenceStartWall >= silenceTimeoutMs) {
            this.emitUtterance(cfg.chunkMs);
            this.resetUtteranceFlags();
            voiceStartWall = null;
            silenceStartWall = null;
            return;
          }
        } else {
          silenceStartWall = null;
        }

        if (elapsed >= maxUtteranceMs) {
          this.emitUtterance(cfg.chunkMs);
          this.resetUtteranceFlags();
          voiceStartWall = null;
          silenceStartWall = null;
        }
      } catch (e) {
        try { this.opts.onError(new Error('VAD monitor error')); } catch {}
      }
    }, sampleEveryMs);
  }

  private emitUtterance(chunkMs: number) {
    const startIdx = this.utteranceStartIndex ?? Math.max(0, this.chunks.length - 1);
    const endIdx = this.chunks.length; // cut at current buffer end
    const selection = this.chunks.slice(startIdx, endIdx);
    const estMs = selection.length * chunkMs;

    if (estMs < this.opts.minUtteranceMs) {
      if (this.opts.pruneOnUtterance && startIdx > 0) this.chunks.splice(0, startIdx);
      return;
    }

    if (selection.length) {
      const mime = this.mediaRecorder?.mimeType || 'audio/webm';
      const blob = new Blob(selection, { type: mime });
      try { this.opts.onUtterance(blob); } catch {}
      try { this.opts.onSilenceDetected(blob); } catch {}
    }

    if (this.opts.pruneOnUtterance) this.chunks.splice(0, endIdx);
  }

  private resetUtteranceFlags() {
    this.state.isSpeaking = false;
    this.utteranceStartIndex = null;
    this.utteranceStartWallMs = null;
  }
}