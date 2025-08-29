// Binary WAV stream player for WebSocket-based audio
const DEBUG = true;

function logDebug(...args: any[]) {
  if (DEBUG) console.log('[BinaryStreamPlayer]', ...args);
}

export class BinaryStreamPlayerService {
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private onPlaybackEnd: (() => void) | null = null;
  private streamEnded = false;
  private isPlaying = false;
  private chunkCount = 0;

  constructor(onPlaybackEnd?: () => void) {
    this.onPlaybackEnd = onPlaybackEnd || null;
  }

  private async ensureAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  public appendBinaryChunk = async (chunk: ArrayBuffer) => {
    if (this.streamEnded) return;

    try {
      const audioContext = await this.ensureAudioContext();
      
      // Decode the WAV chunk
      const audioBuffer = await audioContext.decodeAudioData(chunk);
      
      // Create and play the audio source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      // Store reference to prevent garbage collection
      this.sourceNode = source;
      
      // Start playback immediately
      source.start(0);
      
      // Track chunk count
      this.chunkCount++;
      logDebug(`WAV chunk ${this.chunkCount} decoded and playing`);
      
      // Signal start on first chunk
      if (!this.isPlaying) {
        this.isPlaying = true;
        logDebug('WAV playback started');
      }
      
      // Clean up when done
      source.onended = () => {
        this.sourceNode = null;
        logDebug(`WAV chunk ${this.chunkCount} finished playing`);
      };
      
    } catch (error) {
      console.error('[BinaryStreamPlayer] Error decoding WAV chunk:', error);
    }
  };
  
  public endStream = () => {
    this.streamEnded = true;
    logDebug('WAV stream ended');
    
    // Call completion callback after a short delay to allow final chunks to play
    setTimeout(() => {
      this.isPlaying = false;
      if (this.onPlaybackEnd) {
        this.onPlaybackEnd();
      }
    }, 100);
  };

  public play = async () => {
    // For WAV streaming, playback starts automatically with each chunk
    // This method is kept for compatibility but doesn't need to do anything
    logDebug('Play called - WAV chunks play automatically');
  };

  public cleanup = () => {
    logDebug('Cleaning up BinaryStreamPlayerService');
    
    // Stop any playing audio
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      this.sourceNode = null;
    }
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isPlaying = false;
    this.streamEnded = false;
    this.chunkCount = 0;
  };
}