// src/services/voice/StreamPlayerService.ts

class StreamPlayerService {
  private audioElement: HTMLAudioElement;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private queue: Uint8Array[] = [];
  private isPlaying: boolean = false;
  private onPlaybackComplete: (() => void) | null = null;
  private streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
  private streamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private hasStartedPlayback: boolean = false;
  private readonly BUFFER_THRESHOLD = 16000; // Approx 0.5-1 second of audio data

  // Audio analysis properties
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private audioLevel = 0;
  private analysisFrameId: number | null = null;
  private listeners = new Set<() => void>();

  constructor() {
    this.audioElement = new Audio();
    this.audioElement.addEventListener('ended', this.handlePlaybackEnded.bind(this));
  }

  public getStreamController(onComplete: () => void): ReadableStreamDefaultController<Uint8Array> {
    if (this.mediaSource && this.mediaSource.readyState !== 'ended') {
      this.mediaSource.endOfStream();
    }
    this.audioElement.src = '';
    this.mediaSource = new MediaSource();
    this.audioElement.src = URL.createObjectURL(this.mediaSource);
    this.sourceBuffer = null;
    this.onPlaybackComplete = onComplete;
    this.isPlaying = false;
    this.queue = [];
    this.hasStartedPlayback = false;

    const stream = new ReadableStream({
      start: (controller) => {
        this.streamController = controller;
        this.mediaSource!.addEventListener('sourceopen', () => {
          this.initializeSourceBuffer();
          this.processQueue();
        });
      }
    });
    
    // This is a bit of a workaround to get the controller
    // without starting the stream reading immediately.
    this.playStream(stream, onComplete);

    return this.streamController!;
  }

  private initializeSourceBuffer() {
    if (this.mediaSource && this.mediaSource.readyState === 'open') {
      this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg');
      this.sourceBuffer.addEventListener('updateend', () => {
        this.processQueue();
      });
    }
  }

  private processQueue() {
    if (this.sourceBuffer && !this.sourceBuffer.updating && this.queue.length > 0) {
      const chunk = this.queue.shift();
      if (chunk) {
        if (!this.hasStartedPlayback) {
          const bufferedAmount = this.queue.reduce((acc, val) => acc + val.length, chunk.length);
          if (bufferedAmount >= this.BUFFER_THRESHOLD) {
            this.hasStartedPlayback = true;
            this.audioElement.play().catch(e => console.error("Audio play failed:", e));
          } else {
            // Put it back and wait for more data
            this.queue.unshift(chunk);
            return;
          }
        }
        const arrayBuffer = new ArrayBuffer(chunk.length);
        const view = new Uint8Array(arrayBuffer);
        view.set(chunk);
        this.sourceBuffer.appendBuffer(arrayBuffer);
      }
    }
  }

  public async playStream(stream: ReadableStream<Uint8Array>, onComplete: () => void) {
    if (!this.audioElement || !window.MediaSource) {
      console.error("Streaming not supported or audio element not initialized.");
      onComplete();
      return;
    }

    this.stop(); // Stop any previous playback
    this.onPlaybackComplete = onComplete;
    this.mediaSource = new MediaSource();
    this.audioElement.src = URL.createObjectURL(this.mediaSource);

    this.mediaSource.addEventListener('sourceopen', () => this.handleSourceOpen(stream));
    this.setupAudioAnalysis();
  }

  public stop() {
    if (this.streamReader) {
      this.streamReader.cancel();
      this.streamReader = null;
    }
    this.stopAudioAnalysis();
    if (this.audioElement) {
      this.audioElement.pause();
      if (this.audioElement.src) {
        URL.revokeObjectURL(this.audioElement.src);
        this.audioElement.removeAttribute('src');
      }
    }
    if (this.mediaSource && this.mediaSource.readyState === 'open') {
      this.mediaSource.endOfStream();
    }
    this.sourceBuffer = null;
    this.mediaSource = null;
  }

  private async handleSourceOpen(stream: ReadableStream<Uint8Array>) {
    if (!this.mediaSource) return;

    this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg');
    this.streamReader = stream.getReader();
    
    // Buffer to accumulate audio data
    let audioBuffer = new Uint8Array(0);
    const MIN_BUFFER_SIZE = 32768; // 32KB minimum before starting playback

    const processNextChunk = async () => {
      if (!this.streamReader) return;

      const { done, value } = await this.streamReader.read();

      if (done) {
        // Flush any remaining audio data
        if (audioBuffer.length > 0) {
          this.appendBuffer(audioBuffer, () => {
            this.endStreamSafely();
          });
        } else {
          this.endStreamSafely();
        }
        return;
      }

      // Accumulate audio data
      const newBuffer = new Uint8Array(audioBuffer.length + value.length);
      newBuffer.set(audioBuffer);
      newBuffer.set(value, audioBuffer.length);
      audioBuffer = newBuffer;

      // Start playback once we have enough data
      if (audioBuffer.length >= MIN_BUFFER_SIZE && this.audioElement?.paused) {
        this.audioElement?.play().catch(e => console.error("Audio play failed:", e));
        this.startAudioAnalysis();
      }

      // Process accumulated data in chunks
      const CHUNK_SIZE = 16384; // 16KB chunks
      if (audioBuffer.length >= CHUNK_SIZE) {
        const chunk = audioBuffer.slice(0, CHUNK_SIZE);
        audioBuffer = audioBuffer.slice(CHUNK_SIZE);
        
        this.appendBuffer(chunk, () => {
          processNextChunk();
        });
      } else {
        // Continue reading if we don't have enough data yet
        processNextChunk();
      }
    };
    
    processNextChunk();
  }

  private appendBuffer(buffer: Uint8Array, callback: () => void) {
    if (this.sourceBuffer && !this.sourceBuffer.updating) {
      this.sourceBuffer.addEventListener('updateend', callback, { once: true });
      const arrayBuffer = new ArrayBuffer(buffer.length);
      const view = new Uint8Array(arrayBuffer);
      view.set(buffer);
      this.sourceBuffer.appendBuffer(arrayBuffer);
    }
  }

  private endStreamSafely() {
    if (this.sourceBuffer?.updating) {
      const onUpdateEnd = () => {
        if (this.mediaSource && this.mediaSource.readyState === 'open') {
          this.mediaSource.endOfStream();
        }
      };
      this.sourceBuffer.addEventListener('updateend', onUpdateEnd, { once: true });
    } else {
      if (this.mediaSource && this.mediaSource.readyState === 'open') {
        this.mediaSource.endOfStream();
      }
    }
  }

  private handlePlaybackEnded() {
    if (this.onPlaybackComplete) {
      this.onPlaybackComplete();
    }
    this.stop();
  }

  // --- Audio Analysis Methods ---

  private setupAudioAnalysis() {
    if (typeof window === 'undefined' || !this.audioElement) return;
    if (this.audioContext) return; // Already setup

    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
    this.sourceNode.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
  }
  
  private startAudioAnalysis() {
    if (!this.analyser || this.analysisFrameId) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!this.analyser) return;
      this.analyser.getByteTimeDomainData(dataArray);
      let sumSquares = 0.0;
      for (const amplitude of dataArray) {
        const normalized = (amplitude - 128) / 128;
        sumSquares += normalized * normalized;
      }
      this.audioLevel = Math.sqrt(sumSquares / dataArray.length);
      this.notifyListeners();
      this.analysisFrameId = requestAnimationFrame(updateLevel);
    };

    this.analysisFrameId = requestAnimationFrame(updateLevel);
  }

  private stopAudioAnalysis() {
    if (this.analysisFrameId) {
      cancelAnimationFrame(this.analysisFrameId);
      this.analysisFrameId = null;
    }
    this.audioLevel = 0;
    this.notifyListeners();
  }

  public getCurrentAudioLevel(): number {
    return this.audioLevel;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l());
  }
}

export const streamPlayerService = new StreamPlayerService();