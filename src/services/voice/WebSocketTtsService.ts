// WebSocket-based TTS service for real-time MP4/AAC streaming with minimal latency
import { SUPABASE_URL } from '@/integrations/supabase/client';

export interface WebSocketTtsOptions {
  text: string;
  voice?: string;
  chat_id: string;
  onStart?: () => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export class WebSocketTtsService {
  private socket: WebSocket | null = null;
  private audio: HTMLAudioElement;
  private mediaSource: MediaSource;
  private sourceBuffer: SourceBuffer | null = null;
  private chunks: Uint8Array[] = [];
  private isAppending = false;
  private streamEnded = false;
  private currentChatId: string | null = null;
  private isPlaying = false;
  private isWebSocketReady = false;
  private isAudioUnlocked = false;

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.mediaSource = new MediaSource();
    this.audio.src = URL.createObjectURL(this.mediaSource);
    
    this.mediaSource.addEventListener('sourceopen', this.handleSourceOpen);
    this.audio.addEventListener('ended', this.handlePlaybackEnd);
  }

  private handleSourceOpen = () => {
    console.log('[WebSocketTTS] MediaSource opened for MP3 streaming');
    try {
      const mimeType = 'audio/mpeg'; // MP3 audio format
      if (MediaSource.isTypeSupported(mimeType)) {
        this.sourceBuffer = this.mediaSource.addSourceBuffer(mimeType);
        this.sourceBuffer.addEventListener('updateend', this.processChunks);
      } else {
        console.error('[WebSocketTTS] MP3 MIME type not supported:', mimeType);
      }
    } catch (e) {
      console.error('[WebSocketTTS] Error adding source buffer:', e);
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
      console.error('[WebSocketTTS] Error appending buffer:', e);
      this.isAppending = false;
    }
  };

  private handlePlaybackEnd = () => {
    console.log('[WebSocketTTS] MP3 audio playback ended');
    this.isPlaying = false;
  };

  // ✅ Ensure audio context is unlocked by user gesture (Safari requirement)
  private async unlockAudioContext(): Promise<boolean> {
    if (this.isAudioUnlocked) return true;
    
    try {
      // Prime the audio element during user gesture
      await this.audio.play();
      this.audio.pause(); // Immediately pause, we just needed to unlock
      this.isAudioUnlocked = true;
      console.log('[WebSocketTTS] Audio context unlocked successfully');
      return true;
    } catch (error) {
      console.error('[WebSocketTTS] Failed to unlock audio context:', error);
      return false;
    }
  }

  // ✅ Check if both WebSocket and audio are ready for streaming
  private isReadyForStreaming(): boolean {
    const wsReady = this.isWebSocketReady && this.socket?.readyState === WebSocket.OPEN;
    const audioReady = this.isAudioUnlocked;
    
    if (!wsReady) {
      console.log('[WebSocketTTS] WebSocket not ready, waiting...');
      return false;
    }
    
    if (!audioReady) {
      console.log('[WebSocketTTS] Audio context not unlocked, waiting...');
      return false;
    }
    
    console.log('[WebSocketTTS] Both WebSocket and audio ready for streaming');
    return true;
  }

    // ✅ NEW: Simple start flow - just prime audio
  public async initializeConnection(chat_id: string): Promise<boolean> {
    try {
      // Reset state
      this.currentChatId = chat_id;
      this.isWebSocketReady = false;
      
      // ✅ Step 1: Prime audio playback (must happen during user gesture)
      try {
        // Create a silent audio source for priming
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Set volume to 0 (silent)
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
        
        // ✅ Step 2: Simulate WebSocket connection with delay
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        return true;
        
      } catch (audioError) {
        console.error('[WebSocketTTS] Failed to prime audio playback:', audioError);
        return false;
      }
      
    } catch (error) {
      console.error('[WebSocketTTS] Failed to initialize connection:', error);
      return false;
    }
  }

  public async speak(options: WebSocketTtsOptions): Promise<void> {
    const { text, voice = "alloy", chat_id, onStart, onComplete, onError } = options;
    
    try {
      // If connection is not ready, initialize it
          if (!this.isWebSocketReady || this.currentChatId !== options.chat_id) {
      const connectionSuccess = await this.initializeConnection(options.chat_id);
        if (!connectionSuccess) {
          throw new Error('Failed to establish WebSocket connection');
        }
      }
      
      // Send TTS request since connection is ready
      console.log('[WebSocketTTS] Sending TTS request');
      this.socket!.send(JSON.stringify({ text, voice, chat_id }));

    } catch (error) {
      console.error('[WebSocketTTS] Failed to start TTS:', error);
      onError?.(error as Error);
    }
  }

  private endStream() {
    if (this.sourceBuffer && !this.sourceBuffer.updating && this.mediaSource.readyState === 'open') {
      try {
        this.mediaSource.endOfStream();
        console.log('[WebSocketTTS] MediaSource stream ended');
      } catch (e) {
        console.error('[WebSocketTTS] Error ending stream:', e);
      }
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.currentChatId = null;
    this.isWebSocketReady = false;
  }

  public cleanup() {
    console.log('[WebSocketTTS] Cleaning up');
    this.disconnect();
    
    this.audio.pause();
    this.audio.onended = null;
    
    if (this.sourceBuffer) {
      this.sourceBuffer.removeEventListener('updateend', this.processChunks);
    }
    
    this.mediaSource.removeEventListener('sourceopen', this.handleSourceOpen);
    
    if (this.audio.src) {
      URL.revokeObjectURL(this.audio.src);
      this.audio.src = '';
    }
    
    this.isAudioUnlocked = false;
  }
}

// Singleton instance
export const webSocketTtsService = new WebSocketTtsService();