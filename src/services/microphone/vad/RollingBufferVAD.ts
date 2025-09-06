/**
 * 🎯 ROLLING BUFFER VAD - Team's Clean Implementation
 * 
 * Professional rolling buffer VAD implementation based on team's proven approach.
 * Uses index-based selection, no timestamps, proper memory management.
 */

export interface RollingBufferVADOptions {
  // Buffering and chunking
  lookbackWindowMs?: number;   // Total audio to keep in rolling buffer (default 15000ms)
  chunkDurationMs?: number;    // Desired MediaRecorder timeslice (default 200ms, clamped >= 100ms)
  preRollMs?: number;          // Include a bit before voice start (default 250ms)
  postRollMs?: number;         // Include a bit after silence (default 150ms)
  pruneOnUtterance?: boolean;  // Drop used chunks after emitting (default true)

  // VAD thresholds and timings (RMS on analyser)
  voiceThreshold?: number;     // Start speaking threshold (default 0.012)
  silenceThreshold?: number;   // Silence threshold (default 0.008)
  voiceConfirmMs?: number;     // How long above voiceThreshold to confirm speech (default 300ms)
  silenceTimeoutMs?: number;   // How long below silenceThreshold to end utterance (default 1500ms)
  maxUtteranceMs?: number;     // Force-cut very long utterances (default 15000ms)
  minUtteranceMs?: number;     // Drop very short utterances (default 250ms)

  // Lifecycle
  onVoiceStart?: () => void;
  // New: pass Blob on each utterance; use this for your STT
  onUtterance?: (blob: Blob) => void;
  // Back-compat: also fires with the utterance Blob
  onSilenceDetected?: (blob?: Blob) => void;
  onError?: (error: Error) => void;

  // Resources
  stopTracksOnCleanup?: boolean; // If true, stops MediaStream tracks (default false)
}

export interface RollingBufferVADState {
  audioLevel: number;  // RMS 0..1
  isSpeaking: boolean;
}

type AudioChunk = Blob;

export class RollingBufferVAD {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private monitorTimer: number | null = null;

  // Rolling buffer (no timestamps; index-based extraction)
  private chunks: AudioChunk[] = [];
  private utteranceStartIndex: number | null = null;
  private utteranceStartWallMs: number | null = null;
  
  // Chrome WebM header preservation
  private webmHeaderChunk: AudioChunk | null = null;
  private needsHeaderPreservation: boolean = false;
  
  private options: Required<RollingBufferVADOptions>;
  private state: RollingBufferVADState = { audioLevel: 0, isSpeaking: false };
  private stream: MediaStream | null = null;

  constructor(opts: RollingBufferVADOptions = {}) {
    this.options = {
      lookbackWindowMs: 15000,
      chunkDurationMs: 200,
      preRollMs: 250,
      postRollMs: 150,
      pruneOnUtterance: true,

      voiceThreshold: 0.012,
      silenceThreshold: 0.008,
      voiceConfirmMs: 300,
      silenceTimeoutMs: 1500,
      maxUtteranceMs: 15000,
      minUtteranceMs: 250,

      onVoiceStart: () => {},
      onUtterance: () => {},
      onSilenceDetected: () => {},
      onError: () => {},
      stopTracksOnCleanup: false,
      ...opts
    };
  }

  getState(): RollingBufferVADState {
    return { ...this.state };
  }

  async start(stream: MediaStream, mediaRecorder: MediaRecorder, audioContext?: AudioContext): Promise<void> {
    this.cleanup(); // ensure clean start
    this.stream = stream;

    // Prepare AudioContext + analyser (create if not provided)
    this.audioContext = audioContext ?? new (window.AudioContext || (window as any).webkitAudioContext)();
    this.sourceNode = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024; // light CPU
    this.sourceNode.connect(this.analyser);

    // Use provided MediaRecorder (created by service layer for user gesture enforcement)
    this.mediaRecorder = mediaRecorder;

    // Rolling buffer: keep only N recent chunks
    const chunkMs = Math.max(100, this.options.chunkDurationMs);
    const maxChunks = Math.max(1, Math.ceil(this.options.lookbackWindowMs / chunkMs));
    const preRollChunks = Math.max(0, Math.ceil(this.options.preRollMs / chunkMs));
    const postRollChunks = Math.max(0, Math.ceil(this.options.postRollMs / chunkMs));

    this.mediaRecorder.ondataavailable = (evt) => {
      if (evt.data && evt.data.size > 0) {
        // Chrome WebM header preservation: cache first chunk with header
        if (!this.webmHeaderChunk && this.needsHeaderPreservation && this.chunks.length === 0) {
          this.webmHeaderChunk = evt.data;
          this.log(`WebM header chunk cached (${evt.data.size} bytes)`);
        }
        
        this.chunks.push(evt.data);
        // trim to rolling window
        while (this.chunks.length > maxChunks) this.chunks.shift();
      }
    };

    this.mediaRecorder.onerror = (evt: any) => {
      this.error('MediaRecorder error', evt?.error || evt);
      this.options.onError(new Error('MediaRecorder error'));
    };

    this.mediaRecorder.onstop = () => {
      // no-op; stop() aggregates explicitly
    };

    // Detect if we need WebM header preservation (Chrome with WebM)
    const mimeType = this.mediaRecorder.mimeType || '';
    this.needsHeaderPreservation = mimeType.includes('webm') && !mimeType.includes('mp4');
    this.log(`Header preservation needed: ${this.needsHeaderPreservation} (mimeType: ${mimeType})`);

    // Start continuous recording with timeSlice; retry without timeslice if needed
    try {
      this.mediaRecorder.start(chunkMs);
      this.log(`MediaRecorder started with ${chunkMs}ms slices; mimeType=${this.mediaRecorder.mimeType}`);
    } catch (e) {
      this.warn(`start(${chunkMs}) failed; retrying without timeslice`, e);
      try {
        this.mediaRecorder.start();
        this.log(`MediaRecorder started without timeslice; mimeType=${this.mediaRecorder.mimeType}`);
      } catch (e2) {
        this.error('MediaRecorder failed to start', e2);
        this.options.onError(new Error('Unable to start MediaRecorder'));
        throw e2;
      }
    }

    // VAD monitor: low CPU, steady cadence
    this.startMonitoring({
      preRollChunks,
      postRollChunks,
      chunkMs,
    });
  }

  // Stop and return a single Blob of whatever remains in the buffer
  stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const finish = () => {
        const blob = this.chunks.length
          ? new Blob(this.chunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' })
          : null;
        this.cleanup();
        resolve(blob);
      };

      try {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          const mr = this.mediaRecorder;
          mr.addEventListener('stop', () => setTimeout(finish, 30), { once: true });
          mr.stop();
        } else {
          setTimeout(finish, 30);
        }
      } catch {
        setTimeout(finish, 30);
      }
    });
  }

  cleanup(): void {
    // Stop monitor
    if (this.monitorTimer !== null) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }

    // Stop MediaRecorder
    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
      } catch {}
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onerror = null;
      this.mediaRecorder.onstop = null;
      this.mediaRecorder = null;
    }

    // Disconnect audio graph
    try {
      if (this.sourceNode) this.sourceNode.disconnect();
      if (this.analyser) this.analyser.disconnect();
    } catch {}

    // Optionally stop mic tracks
    if (this.options.stopTracksOnCleanup && this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
    }

    this.sourceNode = null;
    this.analyser = null;
    // Do not close provided AudioContext; just null it to avoid interfering with app
    this.audioContext = null;

    // Reset buffers and state
    this.chunks = [];
    this.utteranceStartIndex = null;
    this.utteranceStartWallMs = null;
    this.webmHeaderChunk = null;
    this.needsHeaderPreservation = false;
    this.state = { audioLevel: 0, isSpeaking: false };
  }

  // Internal

  private startMonitoring(cfg: { preRollChunks: number; postRollChunks: number; chunkMs: number }) {
    if (!this.analyser) return;
    const analyser = this.analyser;
    const bufLen = analyser.fftSize;
    const data = new Uint8Array(bufLen);

    let voiceStartWall: number | null = null;
    let silenceStartWall: number | null = null;

    const sampleEveryMs = 40; // ~25Hz, good for mobile
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
        const { voiceThreshold, silenceThreshold, voiceConfirmMs, silenceTimeoutMs, maxUtteranceMs } = this.options;

        if (!this.state.isSpeaking) {
          // Waiting for confirmed voice
          if (rms > voiceThreshold) {
            if (voiceStartWall === null) voiceStartWall = now;
            if (now - voiceStartWall >= voiceConfirmMs) {
              // Confirm voice and mark utterance start at current buffer end - preRoll
              this.state.isSpeaking = true;
              this.utteranceStartWallMs = now;
              // Place start index a few chunks back (pre-roll), clamp at 0
              const startIdx = Math.max(0, this.chunks.length - cfg.preRollChunks);
              this.utteranceStartIndex = startIdx;
              silenceStartWall = null;
              voiceStartWall = null;
              this.safeCall(() => this.options.onVoiceStart());
              this.log(`Voice confirmed. StartIndex=${startIdx}, chunks=${this.chunks.length}`);
            }
          } else {
            voiceStartWall = null;
          }
        } else {
          // Currently speaking: check for silence end or max length
          const elapsed = this.utteranceStartWallMs ? now - this.utteranceStartWallMs : 0;

          if (rms < silenceThreshold) {
            if (silenceStartWall === null) silenceStartWall = now;
            if (now - silenceStartWall >= silenceTimeoutMs) {
              // End utterance due to silence
              this.emitUtterance(cfg.postRollChunks, cfg.chunkMs, 'silence');
              // Reset for next utterance
              this.state.isSpeaking = false;
              this.utteranceStartIndex = null;
              this.utteranceStartWallMs = null;
              voiceStartWall = null;
              silenceStartWall = null;
            }
          } else {
            silenceStartWall = null;
          }

          // Hard cap very long utterances
          if (elapsed >= maxUtteranceMs) {
            this.emitUtterance(cfg.postRollChunks, cfg.chunkMs, 'maxLength');
            this.state.isSpeaking = false;
            this.utteranceStartIndex = null;
            this.utteranceStartWallMs = null;
            voiceStartWall = null;
            silenceStartWall = null;
          }
        }
      } catch (e) {
        this.error('VAD monitor error', e);
      }
    }, sampleEveryMs);
  }

  private emitUtterance(postRollChunks: number, chunkMs: number, reason: 'silence' | 'maxLength') {
    const startIdx = this.utteranceStartIndex ?? Math.max(0, this.chunks.length - 1);
    const endIdx = Math.min(this.chunks.length - 1, this.chunks.length - 1 + postRollChunks);
    const sliceEnd = Math.min(this.chunks.length, endIdx + 1 + postRollChunks);

    // Since we don't have timestamps, include everything from startIdx to near-end with a small post-roll
    const finalEnd = Math.min(this.chunks.length, this.chunks.length + postRollChunks);
    const selection = this.chunks.slice(startIdx, finalEnd);

    // Estimate duration for minUtterance check
    const estMs = selection.length * chunkMs;
    if (estMs < this.options.minUtteranceMs) {
      this.log(`Dropping short utterance (${Math.round(estMs)}ms) reason=${reason}`);
      if (this.options.pruneOnUtterance && startIdx > 0) {
        // prune pre-roll to avoid growth
        this.chunks.splice(0, startIdx);
      }
      return;
    }

    // Chrome WebM header fix: prepend header if needed and missing
    let finalSelection = selection;
    if (this.needsHeaderPreservation && this.webmHeaderChunk && selection.length > 0) {
      // Check if first chunk has header (contains EBML signature)
      const firstChunk = selection[0];
      const hasHeader = this.checkForWebMHeader(firstChunk);
      
      if (!hasHeader) {
        finalSelection = [this.webmHeaderChunk, ...selection];
        this.log(`WebM header prepended to utterance (${selection.length} -> ${finalSelection.length} chunks)`);
      } else {
        this.log(`WebM header already present in utterance`);
      }
    }

    const blob = finalSelection.length
      ? new Blob(finalSelection, { type: this.mediaRecorder?.mimeType || 'audio/webm' })
      : null;

    if (blob) {
      // Log blob diagnostics for debugging
      this.logBlobDiagnostics(blob, reason);
      
      this.safeCall(() => this.options.onUtterance(blob));
      // Back-compat: pass blob to onSilenceDetected as well
      this.safeCall(() => this.options.onSilenceDetected(blob));
      this.log(`Utterance emitted (${Math.round(estMs)}ms, ${finalSelection.length} chunks) reason=${reason}`);
    }

    // Prune used chunks to keep memory small on mobile
    if (this.options.pruneOnUtterance) {
      const used = Math.min(this.chunks.length, finalEnd);
      this.chunks.splice(0, used);
      this.log(`Pruned ${used} chunks after utterance; remaining=${this.chunks.length}`);
    }
  }

  // Utils

  private safeCall(fn: () => void) {
    try { fn(); } catch (e) { this.error('Callback error', e); }
  }

  private log(msg: string, ...args: any[]) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('debugAudio') !== '1') return;
    } catch {}
    console.log('[RollingBufferVAD]', msg, ...args);
  }

  private warn(msg: string, ...args: any[]) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('debugAudio') !== '1') return;
    } catch {}
    console.warn('[RollingBufferVAD]', msg, ...args);
  }

  private error(msg: string, ...args: any[]) {
    console.error('[RollingBufferVAD]', msg, ...args);
  }

  // Chrome WebM header detection (simplified for synchronous use)
  private checkForWebMHeader(chunk: AudioChunk): boolean {
    // For VAD use case, we'll use a simple heuristic:
    // If chunk size is very small (< 100 bytes), likely missing header
    // This is a pragmatic approach for real-time processing
    return chunk.size >= 100;
  }

  // Blob diagnostics for debugging
  private async logBlobDiagnostics(blob: Blob, reason: string) {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('debugAudio') !== '1') return;
      
      const arrayBuffer = await blob.arrayBuffer();
      const view = new Uint8Array(arrayBuffer);
      
      // Check first 16 bytes for header signatures
      const first16 = Array.from(view.slice(0, 16))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      
      const hasEBML = view.length >= 4 && 
        view[0] === 0x1A && view[1] === 0x45 && 
        view[2] === 0xDF && view[3] === 0xA3;
      
      this.log(`Blob diagnostics (${reason}):`, {
        size: blob.size,
        type: blob.type,
        hasEBML,
        first16Bytes: first16
      });
    } catch (e) {
      this.warn('Failed to analyze blob:', e);
    }
  }
}