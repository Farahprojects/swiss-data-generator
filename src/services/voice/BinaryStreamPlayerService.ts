// Binary MP3 stream player for WebSocket-based audio
const DEBUG = true;

function logDebug(...args: any[]) {
  if (DEBUG) console.log('[BinaryStreamPlayer]', ...args);
}

export class BinaryStreamPlayerService {
  private audio: HTMLAudioElement;
  private mediaSource: MediaSource;
  private sourceBuffer: SourceBuffer | null = null;
  private chunks: Uint8Array[] = [];
  private isAppending = false;
  private onPlaybackEnd: (() => void) | null = null;
  private streamEnded = false;
  private isPlaying = false;

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
    logDebug('MediaSource opened');
    try {
      const mimeType = 'audio/mpeg';
      if (MediaSource.isTypeSupported(mimeType)) {
        this.sourceBuffer = this.mediaSource.addSourceBuffer(mimeType);
        this.sourceBuffer.addEventListener('updateend', this.processChunks);
      } else {
        console.error('[BinaryStreamPlayer] MIME type not supported:', mimeType);
      }
    } catch (e) {
      console.error('[BinaryStreamPlayer] Error adding source buffer:', e);
    }
  };

  public appendBinaryChunk = (chunk: Uint8Array) => {
    if (this.streamEnded) return;

    this.chunks.push(chunk);
    this.processChunks();
    
    // Auto-start playback on first chunk
    if (!this.isPlaying && this.chunks.length === 1) {
      this.play();
    }
  };

  private processChunks = () => {
    if (this.isAppending || this.chunks.length === 0 || !this.sourceBuffer || this.sourceBuffer.updating) {
      return;
    }

    this.isAppending = true;
    const chunk = this.chunks.shift()!;
    
    try {
      this.sourceBuffer.appendBuffer(chunk.buffer as ArrayBuffer);
    } catch (e) {
      console.error('[BinaryStreamPlayer] Error appending buffer:', e);
      this.isAppending = false;
    }
  };
  
  public endStream = () => {
    this.streamEnded = true;
    const endOfStream = () => {
      if (this.sourceBuffer && !this.sourceBuffer.updating && this.mediaSource.readyState === 'open') {
        try {
          this.mediaSource.endOfStream();
          logDebug('MediaSource stream ended');
        } catch (e) {
          console.error('[BinaryStreamPlayer] Error ending stream:', e);
        }
      } else {
        setTimeout(endOfStream, 100);
      }
    };
    endOfStream();
  };

  public play = async () => {
    if (this.audio.paused) {
      try {
        await this.audio.play();
        this.isPlaying = true;
        logDebug('Playback started');
      } catch (error) {
        console.error('[BinaryStreamPlayer] Error starting playback:', error);
      }
    }
  };

  private handlePlaybackEnd = () => {
    logDebug('Playback ended');
    this.isPlaying = false;
    if (this.onPlaybackEnd) {
      this.onPlaybackEnd();
    }
  };

  public cleanup = () => {
    logDebug('Cleaning up BinaryStreamPlayerService');
    this.audio.removeEventListener('ended', this.handlePlaybackEnd);
    this.mediaSource.removeEventListener('sourceopen', this.handleSourceOpen);
    if (this.sourceBuffer) {
      this.sourceBuffer.removeEventListener('updateend', this.processChunks);
    }
    if (this.audio.src) {
      URL.revokeObjectURL(this.audio.src);
    }
    this.audio.pause();
    this.audio.src = '';
    this.isPlaying = false;
  };
}