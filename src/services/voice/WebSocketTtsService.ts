// WebSocket-based TTS service for real-time MP4/AAC streaming with minimal latency
import { SUPABASE_URL } from '@/integrations/supabase/client';

export interface WebSocketTtsOptions {
  text: string;
  voice?: string;
  chat_id: string;
  sessionId: string;
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
  private currentSessionId: string | null = null;
  private isPlaying = false;

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.mediaSource = new MediaSource();
    this.audio.src = URL.createObjectURL(this.mediaSource);
    
    this.mediaSource.addEventListener('sourceopen', this.handleSourceOpen);
    this.audio.addEventListener('ended', this.handlePlaybackEnd);
  }

  private handleSourceOpen = () => {
    console.log('[WebSocketTTS] MediaSource opened for MP4 streaming');
    try {
      const mimeType = 'video/mp4; codecs="mp4a.40.2"'; // AAC audio in MP4
      if (MediaSource.isTypeSupported(mimeType)) {
        this.sourceBuffer = this.mediaSource.addSourceBuffer(mimeType);
        this.sourceBuffer.addEventListener('updateend', this.processChunks);
      } else {
        console.error('[WebSocketTTS] MP4/AAC MIME type not supported:', mimeType);
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
    console.log('[WebSocketTTS] MP4 audio playback ended');
    this.isPlaying = false;
  };

  public async speak(options: WebSocketTtsOptions): Promise<void> {
    const { text, voice = "alloy", chat_id, sessionId, onStart, onComplete, onError } = options;
    
    try {
      // Clean up previous connection
      this.disconnect();
      this.currentSessionId = sessionId;
      
      // Reset state
      this.chunks = [];
      this.isAppending = false;
      this.streamEnded = false;
      this.isPlaying = false;
      
      // Create new MediaSource if needed
      if (this.mediaSource.readyState === 'closed') {
        this.mediaSource = new MediaSource();
        this.audio.src = URL.createObjectURL(this.mediaSource);
        this.mediaSource.addEventListener('sourceopen', this.handleSourceOpen);
      }

      // Connect to WebSocket
      const wsUrl = `wss://${SUPABASE_URL.replace('https://', '')}/functions/v1/openai-tts-ws?sessionId=${sessionId}`;
      
      this.socket = new WebSocket(wsUrl);
      this.socket.binaryType = 'arraybuffer';

      this.socket.onopen = () => {
        console.log(`[WebSocketTTS] Connected for session: ${sessionId}`);
        // Send TTS request
        this.socket!.send(JSON.stringify({ text, voice, chat_id }));
      };

      this.socket.onmessage = async (event) => {
        if (this.currentSessionId !== sessionId) return; // Ignore old sessions

        if (event.data instanceof ArrayBuffer) {
          // Binary MP4 chunk - add to queue for streaming
          const chunk = new Uint8Array(event.data);
          this.chunks.push(chunk);
          this.processChunks();
          
          // Start playback on first chunk
          if (!this.isPlaying && this.chunks.length === 1) {
            try {
              await this.audio.play();
              this.isPlaying = true;
              onStart?.();
              console.log('[WebSocketTTS] MP4 streaming started');
            } catch (e) {
              console.error('[WebSocketTTS] Play failed:', e);
              onError?.(e as Error);
            }
          }
        } else {
          // JSON message
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'stream-start') {
              console.log('[WebSocketTTS] Stream started');
            } else if (data.type === 'stream-end') {
              console.log('[WebSocketTTS] Stream ended');
              this.streamEnded = true;
              this.endStream();
            } else if (data.error) {
              console.error('[WebSocketTTS] Server error:', data.error);
              onError?.(new Error(data.error));
            }
          } catch (e) {
            console.error('[WebSocketTTS] Failed to parse message:', e);
          }
        }
      };

      this.socket.onerror = (error) => {
        console.error('[WebSocketTTS] WebSocket error:', error);
        onError?.(new Error('WebSocket connection failed'));
      };

      this.socket.onclose = (event) => {
        console.log(`[WebSocketTTS] Connection closed: ${event.code} - ${event.reason}`);
        if (!this.streamEnded) {
          onError?.(new Error('Connection closed unexpectedly'));
        }
      };

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
    this.currentSessionId = null;
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
  }
}

// Singleton instance
export const webSocketTtsService = new WebSocketTtsService();