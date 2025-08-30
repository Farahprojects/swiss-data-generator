// src/services/voice/StreamPlayerService.ts
const DEBUG = true; // Set to false for production

function logDebug(...args: any[]) {
  if (DEBUG) console.log('[StreamPlayerService]', ...args);
}

export class StreamPlayerService {
  private audio: HTMLAudioElement;
  private mediaSource: MediaSource;
  private sourceBuffer: SourceBuffer | null = null;
  private queue: ArrayBuffer[] = [];
  private isAppending = false;
  private onPlaybackEnd: (() => void) | null = null;
  private streamEnded = false;

  constructor(onPlaybackEnd?: () => void) {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.mediaSource = new MediaSource();
    this.audio.src = URL.createObjectURL(this.mediaSource);
    this.onPlaybackEnd = onPlaybackEnd || null;

    this.mediaSource.addEventListener('sourceopen', this.handleSourceOpen);
    this.audio.addEventListener('ended', this.handlePlaybackEnd);
  }

  private handleSourceOpen = () => {
    // MediaSource opened
    try {
        const mimeType = 'audio/mpeg';
        if (MediaSource.isTypeSupported(mimeType)) {
            this.sourceBuffer = this.mediaSource.addSourceBuffer(mimeType);
            this.sourceBuffer.addEventListener('updateend', this.processQueue);
        } else {
            console.error('MIME type not supported:', mimeType);
        }
    } catch (e) {
        console.error('Error adding source buffer:', e);
    }
  };

  public appendChunk = (base64Chunk: string) => {
    if (this.streamEnded) return;

    try {
      const byteCharacters = atob(base64Chunk);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      this.queue.push(byteArray.buffer);
      this.processQueue();
    } catch (e) {
      console.error('Error decoding or queueing chunk:', e);
    }
  };

  private processQueue = () => {
    if (this.isAppending || this.queue.length === 0 || !this.sourceBuffer || this.sourceBuffer.updating) {
      return;
    }

    this.isAppending = true;
    const chunk = this.queue.shift()!;
    try {
      this.sourceBuffer.appendBuffer(chunk);
    } catch (e) {
      console.error('Error appending buffer:', e);
      this.isAppending = false;
    }
  };
  
  public endStream = () => {
    this.streamEnded = true;
    const endOfStream = () => {
        if (this.sourceBuffer && !this.sourceBuffer.updating && this.mediaSource.readyState === 'open') {
            this.mediaSource.endOfStream();
            logDebug('MediaSource stream ended.');
        } else {
            setTimeout(endOfStream, 100);
        }
    }
    endOfStream();
  };


  public play = async () => {
    if (this.audio.paused) {
      try {
        await this.audio.play();
        logDebug('Playback started.');
      } catch (error) {
        console.error('Error starting playback:', error);
      }
    }
  };

  private handlePlaybackEnd = () => {
    logDebug('Playback ended.');
    if (this.onPlaybackEnd) {
      this.onPlaybackEnd();
    }
  };

  public cleanup = () => {
    logDebug('Cleaning up StreamPlayerService.');
    this.audio.removeEventListener('ended', this.handlePlaybackEnd);
    this.mediaSource.removeEventListener('sourceopen', this.handleSourceOpen);
    if (this.sourceBuffer) {
        this.sourceBuffer.removeEventListener('updateend', this.processQueue);
    }
    if (this.audio.src) {
        URL.revokeObjectURL(this.audio.src);
    }
    this.audio.pause();
    this.audio.src = '';
  };
}
