/**
 * 🌊 STREAMING STT SERVICE - WebSocket Audio Streaming
 * 
 * Streams Opus-encoded audio to STT via WebSocket
 * Handles real-time transcription and silence detection
 */

import { WebRTCOpusEncoder } from './OpusEncoder';

export interface StreamingSttOptions {
  sampleRate: number;
  channels: number;
  frameSize: number;
  bitrate: number;
}

export interface StreamingSttCallbacks {
  onTranscript?: (transcript: string, isPartial: boolean) => void;
  onSilenceDetected?: () => void;
  onError?: (error: Error) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export class StreamingSttService {
  private ws: WebSocket | null = null;
  private encoder: WebRTCOpusEncoder;
  private callbacks: StreamingSttCallbacks = {};
  private isStreaming = false;
  private stream: MediaStream | null = null;

  constructor(options: StreamingSttOptions = {
    sampleRate: 16000,
    channels: 1,
    frameSize: 20,
    bitrate: 24000
  }) {
    this.encoder = new WebRTCOpusEncoder(options);
  }

  /**
   * Initialize the streaming STT service
   */
  async initialize(callbacks: StreamingSttCallbacks = {}): Promise<void> {
    this.callbacks = callbacks;
    await this.encoder.initialize();
  }

  /**
   * Start streaming audio to STT
   */
  async startStream(chat_id: string, audioStream: MediaStream): Promise<void> {
    if (this.isStreaming) {
      console.warn('[StreamingStt] Already streaming');
      return;
    }

    try {
      // Store stream reference
      this.stream = audioStream;

      // Create WebSocket connection
      const wsUrl = `${import.meta.env.VITE_SUPABASE_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/functions/v1/streaming-stt`;
      this.ws = new WebSocket(wsUrl, ['streaming-stt']);

      this.ws.onopen = () => {
        console.log('[StreamingStt] ✅ WebSocket connected');
        this.isStreaming = true;
        this.callbacks.onConnected?.();
        
        // Send initial metadata
        this.ws?.send(JSON.stringify({
          type: 'init',
          chat_id,
          config: {
            sampleRate: 16000,
            channels: 1,
            frameSize: 20,
            bitrate: 24000
          }
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('[StreamingStt] Failed to parse message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('[StreamingStt] WebSocket closed');
        this.isStreaming = false;
        this.callbacks.onDisconnected?.();
      };

      this.ws.onerror = (error) => {
        console.error('[StreamingStt] WebSocket error:', error);
        this.callbacks.onError?.(new Error('WebSocket connection failed'));
      };

      // Setup native WebRTC Opus encoding
      await this.setupOpusEncoding(audioStream);

    } catch (error) {
      console.error('[StreamingStt] Failed to start stream:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  /**
   * Setup native WebRTC Opus encoding
   */
  private async setupOpusEncoding(audioStream: MediaStream): Promise<void> {
    try {
      // Start native WebRTC Opus encoding
      await this.encoder.startEncoding(audioStream, (opusData: Blob) => {
        if (!this.isStreaming || !this.ws) return;

        // Send Opus data via WebSocket
        this.ws.send(opusData);
      });

      console.log('[StreamingStt] ✅ Native WebRTC Opus encoding setup complete');

    } catch (error) {
      console.error('[StreamingStt] Opus encoding setup failed:', error);
      throw error;
    }
  }

  /**
   * Handle WebSocket messages
   */
  private handleMessage(data: any): void {
    switch (data.type) {
      case 'transcript':
        this.callbacks.onTranscript?.(data.transcript, data.isPartial);
        break;
      
      case 'silence':
        this.callbacks.onSilenceDetected?.();
        break;
      
      case 'error':
        this.callbacks.onError?.(new Error(data.message));
        break;
      
      default:
        console.warn('[StreamingStt] Unknown message type:', data.type);
    }
  }

  /**
   * Stop streaming
   */
  stopStream(): void {
    if (!this.isStreaming) return;

    console.log('[StreamingStt] Stopping stream...');

    // Stop Opus encoding
    this.encoder.stopEncoding();

    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isStreaming = false;
    this.stream = null;
  }

  /**
   * Check if currently streaming
   */
  isActive(): boolean {
    return this.isStreaming;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopStream();
    this.encoder.destroy();
  }
}

// Singleton instance
export const streamingSttService = new StreamingSttService();
