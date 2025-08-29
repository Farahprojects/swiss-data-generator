// Binary WAV stream player for WebSocket-based audio with minimal latency
const DEBUG = true;

function logDebug(...args: any[]) {
  if (DEBUG) console.log('[BinaryStreamPlayer]', ...args);
}

export class BinaryStreamPlayerService {
  private audioContext: AudioContext | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private onPlaybackEnd: (() => void) | null = null;
  private streamEnded = false;
  private isPlaying = false;
  private chunkCount = 0;
  private isProcessingQueue = false;

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

  private async processAudioQueue(): Promise<void> {
    if (this.isProcessingQueue || this.audioQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    const audioContext = await this.ensureAudioContext();

    while (this.audioQueue.length > 0) {
      const wavChunk = this.audioQueue.shift()!;
      
      try {
        // Decode the WAV chunk immediately
        const audioBuffer = await audioContext.decodeAudioData(wavChunk);
        
        // Create and play the audio source with minimal latency
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        
        // Start playback immediately - no buffering
        source.start(0);
        
        this.chunkCount++;
        logDebug(`WAV chunk ${this.chunkCount} decoded and playing immediately`);
        
        // Signal start on first chunk
        if (!this.isPlaying) {
          this.isPlaying = true;
          logDebug('Real-time WAV playback started');
        }
        
        // Clean up when done
        source.onended = () => {
          logDebug(`WAV chunk ${this.chunkCount} finished playing`);
        };
        
      } catch (error) {
        console.error('[BinaryStreamPlayer] Error decoding WAV chunk:', error);
        // Continue processing other chunks even if one fails
      }
    }

    this.isProcessingQueue = false;
  }

  public appendBinaryChunk = async (chunk: ArrayBuffer) => {
    if (this.streamEnded) return;

    // Add chunk to queue and process immediately
    this.audioQueue.push(chunk);
    
    // Process queue asynchronously to avoid blocking
    this.processAudioQueue().catch(error => {
      console.error('[BinaryStreamPlayer] Error processing audio queue:', error);
    });
  };
  
  public endStream = () => {
    this.streamEnded = true;
    logDebug('WAV stream ended');
    
    // Wait for final chunks to process before calling completion
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
    logDebug('Play called - WAV chunks play automatically with minimal latency');
  };

  public cleanup = () => {
    logDebug('Cleaning up BinaryStreamPlayerService');
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.audioQueue = [];
    this.isPlaying = false;
    this.streamEnded = false;
    this.isProcessingQueue = false;
    this.chunkCount = 0;
  };
}