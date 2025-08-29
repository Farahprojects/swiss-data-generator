// Binary MP4/AAC stream player for WebSocket-based audio with minimal latency
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
  private isAudioUnlocked = false;

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
    logDebug('MediaSource opened for MP4 streaming');
    try {
      const mimeType = 'video/mp4; codecs="mp4a.40.2"'; // AAC audio in MP4
      if (MediaSource.isTypeSupported(mimeType)) {
        this.sourceBuffer = this.mediaSource.addSourceBuffer(mimeType);
        this.sourceBuffer.addEventListener('updateend', this.processChunks);
      } else {
        console.error('[BinaryStreamPlayer] MP4/AAC MIME type not supported:', mimeType);
      }
    } catch (e) {
      console.error('[BinaryStreamPlayer] Error adding source buffer:', e);
    }
  };

  // ✅ Ensure audio context is unlocked by user gesture (Safari requirement)
  public async unlockAudioContext(): Promise<boolean> {
    if (this.isAudioUnlocked) return true;
    
    try {
      // Prime the audio element during user gesture
      await this.audio.play();
      this.audio.pause(); // Immediately pause, we just needed to unlock
      this.isAudioUnlocked = true;
      logDebug('Audio context unlocked successfully');
      return true;
    } catch (error) {
      console.error('[BinaryStreamPlayer] Failed to unlock audio context:', error);
      return false;
    }
  }

  public appendBinaryChunk = (chunk: Uint8Array) => {
    if (this.streamEnded) return;

    // ✅ Only process chunks if audio is unlocked
    if (!this.isAudioUnlocked) {
      logDebug('Audio context not unlocked, discarding chunk');
      return;
    }

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
    // ✅ Only play if audio context is unlocked
    if (!this.isAudioUnlocked) {
      logDebug('Cannot play - audio context not unlocked');
      return;
    }

    if (this.audio.paused) {
      try {
        await this.audio.play();
        this.isPlaying = true;
        logDebug('MP4 streaming started');
      } catch (error) {
        console.error('[BinaryStreamPlayer] Error starting playback:', error);
      }
    }
  };

  private handlePlaybackEnd = () => {
    logDebug('MP4 playback ended');
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
    this.isAudioUnlocked = false;
  };
}