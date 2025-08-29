// WebSocket-based TTS service for real-time WAV streaming
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
  private audioContext: AudioContext | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private streamEnded = false;
  private currentSessionId: string | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;

  constructor() {
    // Initialize audio context on first use
  }

  private async ensureAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  private async decodeAndPlayWavChunk(wavChunk: ArrayBuffer): Promise<void> {
    try {
      const audioContext = await this.ensureAudioContext();
      
      // Decode the WAV chunk
      const audioBuffer = await audioContext.decodeAudioData(wavChunk);
      
      // Create and play the audio source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      // Store reference to prevent garbage collection
      this.sourceNode = source;
      
      // Start playback immediately
      source.start(0);
      
      // Clean up when done
      source.onended = () => {
        this.sourceNode = null;
      };
      
      console.log('[WebSocketTTS] WAV chunk decoded and playing');
      
    } catch (error) {
      console.error('[WebSocketTTS] Error decoding WAV chunk:', error);
      throw error;
    }
  }

  public async speak(options: WebSocketTtsOptions): Promise<void> {
    const { text, voice = "alloy", chat_id, sessionId, onStart, onComplete, onError } = options;
    
    try {
      // Clean up previous connection
      this.disconnect();
      this.currentSessionId = sessionId;
      
      // Reset state
      this.audioQueue = [];
      this.isPlaying = false;
      this.streamEnded = false;
      
      // Initialize audio context
      await this.ensureAudioContext();

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
          // Binary WAV chunk - decode and play immediately
          try {
            await this.decodeAndPlayWavChunk(event.data);
            
            // Signal start on first chunk
            if (!this.isPlaying) {
              this.isPlaying = true;
              onStart?.();
              console.log('[WebSocketTTS] WAV playback started');
            }
          } catch (error) {
            console.error('[WebSocketTTS] Failed to decode WAV chunk:', error);
            onError?.(error as Error);
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
              onComplete?.();
              this.disconnect();
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
    
    this.audioQueue = [];
    this.isPlaying = false;
    this.streamEnded = false;
  }
}

// Singleton instance
export const webSocketTtsService = new WebSocketTtsService();