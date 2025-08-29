// WebSocket-based TTS service for real-time WAV streaming with minimal latency
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
  private isProcessingQueue = false;
  private chunkCount = 0;

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
        console.log(`[WebSocketTTS] WAV chunk ${this.chunkCount} decoded and playing immediately`);
        
        // Signal start on first chunk
        if (!this.isPlaying) {
          this.isPlaying = true;
          console.log('[WebSocketTTS] Real-time WAV playback started');
        }
        
        // Clean up when done
        source.onended = () => {
          console.log(`[WebSocketTTS] WAV chunk ${this.chunkCount} finished playing`);
        };
        
      } catch (error) {
        console.error('[WebSocketTTS] Error decoding WAV chunk:', error);
        // Continue processing other chunks even if one fails
      }
    }

    this.isProcessingQueue = false;
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
      this.isProcessingQueue = false;
      this.chunkCount = 0;
      
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
          // Binary WAV chunk - add to queue and process immediately
          this.audioQueue.push(event.data);
          
          // Process queue asynchronously to avoid blocking
          this.processAudioQueue().catch(error => {
            console.error('[WebSocketTTS] Error processing audio queue:', error);
            onError?.(error);
          });
          
          // Signal start on first chunk
          if (!this.isPlaying) {
            this.isPlaying = true;
            onStart?.();
            console.log('[WebSocketTTS] Real-time WAV streaming started');
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
              
              // Wait for final chunks to process
              setTimeout(() => {
                onComplete?.();
                this.disconnect();
              }, 100);
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
  }
}

// Singleton instance
export const webSocketTtsService = new WebSocketTtsService();