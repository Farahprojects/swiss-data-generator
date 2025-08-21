// src/services/voice/StreamPlayerService.ts

class StreamPlayerService {
  private audio: HTMLAudioElement | null = null;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private onPlaybackComplete: (() => void) | null = null;
  private streamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  constructor() {
    this.initializeAudioElement();
  }

  private initializeAudioElement() {
    if (typeof window !== 'undefined' && !this.audio) {
      this.audio = new Audio();
      this.audio.addEventListener('ended', this.handlePlaybackEnded.bind(this));
    }
  }

  public async playStream(stream: ReadableStream<Uint8Array>, onComplete: () => void) {
    if (!this.audio || !window.MediaSource) {
      console.error("Streaming not supported or audio element not initialized.");
      onComplete();
      return;
    }

    this.stop(); // Stop any previous playback
    this.onPlaybackComplete = onComplete;
    this.mediaSource = new MediaSource();
    this.audio.src = URL.createObjectURL(this.mediaSource);

    this.mediaSource.addEventListener('sourceopen', this.handleSourceOpen.bind(this, stream));
  }

  public stop() {
    if (this.streamReader) {
      this.streamReader.cancel();
      this.streamReader = null;
    }
    if (this.audio) {
      this.audio.pause();
      if (this.audio.src) {
        URL.revokeObjectURL(this.audio.src);
        this.audio.removeAttribute('src');
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

    const processNextChunk = async () => {
      if (!this.streamReader) return;

      const { done, value } = await this.streamReader.read();

      if (done) {
        if (this.mediaSource && this.mediaSource.readyState === 'open') {
          this.mediaSource.endOfStream();
        }
        return;
      }

      if (this.sourceBuffer && !this.sourceBuffer.updating) {
        try {
          this.sourceBuffer.appendBuffer(value);
        } catch (error) {
          console.error("Error appending buffer:", error);
        }
      } else if (this.sourceBuffer) {
        this.sourceBuffer.addEventListener('updateend', () => {
          if (this.sourceBuffer && !this.sourceBuffer.updating) {
             this.sourceBuffer.appendBuffer(value);
          }
        }, { once: true });
      }

      processNextChunk();
    };
    
    this.audio?.play().catch(e => console.error("Audio play failed:", e));
    processNextChunk();
  }

  private handlePlaybackEnded() {
    if (this.onPlaybackComplete) {
      this.onPlaybackComplete();
    }
    this.stop();
  }
}

export const streamPlayerService = new StreamPlayerService();
