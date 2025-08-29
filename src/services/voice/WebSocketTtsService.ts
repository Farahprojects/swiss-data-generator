// WebSocket-based TTS service for real-time PCM streaming with persistent connections
import { SUPABASE_URL } from '@/integrations/supabase/client';
import { PcmStreamPlayerService, PcmPlayerCallbacks } from './PcmStreamPlayerService';

export interface WebSocketTtsOptions {
  text: string;
  voice?: string;
  chat_id: string;
  sessionId: string;
  onStart?: () => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface ConnectionState {
  isConnected: boolean;
  isReady: boolean;
  isAudioUnlocked: boolean;
  sessionId: string | null;
  reconnectAttempts: number;
  lastPing: number;
}

export class WebSocketTtsService {
  private socket: WebSocket | null = null;
  private pcmPlayer: PcmStreamPlayerService;
  private streamEnded = false;
  private isPlaying = false;
  private firstChunkTimeout: number | null = null;
  private chunkCount = 0;
  
  // Connection management
  private connectionState: ConnectionState = {
    isConnected: false,
    isReady: false,
    isAudioUnlocked: false,
    sessionId: null,
    reconnectAttempts: 0,
    lastPing: 0
  };
  
  // Reconnection management
  private reconnectTimeout: number | null = null;
  private healthCheckInterval: number | null = null;
  private pendingTtsRequests: Array<{text: string, voice: string, chat_id: string, onStart?: () => void, onComplete?: () => void, onError?: (error: Error) => void}> = [];
  
  // Constants
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY_BASE = 1000; // 1 second base delay
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly PING_TIMEOUT = 10000; // 10 seconds

  // Web Audio context for unlocking (Phase 2)
  private audioContext: AudioContext | null = null;

  constructor() {
    this.pcmPlayer = new PcmStreamPlayerService({
      onLevel: (rms) => {
        // Audio level callback for speaking bars
        console.log('[WebSocketTTS] Audio level:', rms);
      },
      onError: (error) => {
        console.error('[WebSocketTTS] PCM player error:', error);
      }
    });
  }

  // ✅ Ensure audio context is unlocked by user gesture (Safari requirement)
  private async unlockAudioContext(): Promise<boolean> {
    if (this.connectionState.isAudioUnlocked) return true;
    
    try {
      // Create/resume Web Audio context
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = this.audioContext || new AudioCtx();
      
      await this.audioContext.resume().catch(() => {});
      
      // Initialize PCM player
      await this.pcmPlayer.ensureWorkletLoaded(this.audioContext);
      
      this.connectionState.isAudioUnlocked = true;
      console.log('[WebSocketTTS] Web Audio context unlocked successfully');
      return true;
    } catch (error) {
      console.error('[WebSocketTTS] Failed to unlock audio context:', error);
      return false;
    }
  }

  // ✅ NEW: Initialize persistent connection early (Phase 2)
  public async initializeConnection(sessionId: string): Promise<boolean> {
    console.log(`[WebSocketTTS] Initializing persistent connection for session: ${sessionId}`);
    
    try {
      // Step 1: Try to unlock audio context (non-blocking)
      this.unlockAudioContext().catch(() => {
        console.warn('[WebSocketTTS] Audio context unlock failed, will retry later');
      });
      
      // Step 2: Establish WebSocket connection (primary goal)
      const connected = await this.connectWebSocket(sessionId);
      if (!connected) {
        console.error('[WebSocketTTS] Failed to establish WebSocket connection');
        return false;
      }
      
      // Step 3: Start health monitoring
      this.startHealthMonitoring();
      
      console.log(`[WebSocketTTS] ✅ Connection initialized successfully for session: ${sessionId}`);
      return true;
      
    } catch (error) {
      console.error('[WebSocketTTS] Connection initialization failed:', error);
      return false;
    }
  }

  // ✅ NEW: Simplified TTS request (no connection setup needed)
  public async speakText(text: string, voice: string = "alloy", chat_id: string, onStart?: () => void, onComplete?: () => void, onError?: (error: Error) => void): Promise<void> {
    console.log(`[WebSocketTTS] TTS request: "${text.substring(0, 50)}..."`);
    
    // Check if connection is ready
    if (!this.connectionState.isReady) {
      console.warn('[WebSocketTTS] Connection not ready, attempting to initialize...');
      
      // Try to initialize connection if we have a sessionId
      if (this.connectionState.sessionId) {
        const success = await this.initializeConnection(this.connectionState.sessionId);
        if (!success) {
          console.warn('[WebSocketTTS] Failed to initialize connection, queuing request');
          this.pendingTtsRequests.push({ text, voice, chat_id, onStart, onComplete, onError });
          return;
        }
      } else {
        console.warn('[WebSocketTTS] No sessionId available, queuing request');
        this.pendingTtsRequests.push({ text, voice, chat_id, onStart, onComplete, onError });
        return;
      }
    }
    
    // Reset state for new TTS request
    this.resetTtsState();
    
    try {
      // Send TTS request directly
      this.socket!.send(JSON.stringify({ text, voice, chat_id }));
      
      // Store callbacks for this request
      this.currentTtsCallbacks = { onStart, onComplete, onError };
      
      // Start first-chunk watchdog timer
      this.startFirstChunkWatchdog();
      
    } catch (error) {
      console.error('[WebSocketTTS] Failed to send TTS request:', error);
      onError?.(error as Error);
    }
  }

  // ✅ NEW: Connection health monitoring
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = window.setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private performHealthCheck(): void {
    if (!this.connectionState.isConnected || !this.socket) {
      console.warn('[WebSocketTTS] Health check failed - connection not active');
      this.attemptReconnection();
      return;
    }
    
    // Send ping if connection is idle
    if (Date.now() - this.connectionState.lastPing > this.PING_TIMEOUT) {
      try {
        this.socket.send(JSON.stringify({ type: 'ping' }));
        this.connectionState.lastPing = Date.now();
        console.log('[WebSocketTTS] Health check ping sent');
      } catch (error) {
        console.error('[WebSocketTTS] Health check ping failed:', error);
        this.attemptReconnection();
      }
    }
  }

  // ✅ NEW: Automatic reconnection with exponential backoff
  private async attemptReconnection(): Promise<void> {
    if (this.connectionState.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('[WebSocketTTS] Max reconnection attempts reached');
      this.connectionState.isConnected = false;
      this.connectionState.isReady = false;
      return;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.connectionState.reconnectAttempts++;
    const delay = this.RECONNECT_DELAY_BASE * Math.pow(2, this.connectionState.reconnectAttempts - 1);
    
    console.log(`[WebSocketTTS] Attempting reconnection in ${delay}ms (attempt ${this.connectionState.reconnectAttempts})`);
    
    this.reconnectTimeout = window.setTimeout(async () => {
      if (this.connectionState.sessionId) {
        const success = await this.connectWebSocket(this.connectionState.sessionId);
        if (success) {
          this.connectionState.reconnectAttempts = 0;
          this.processPendingRequests();
        }
      }
    }, delay);
  }

  // ✅ NEW: Process queued TTS requests after reconnection
  private processPendingRequests(): void {
    if (this.pendingTtsRequests.length === 0) return;
    
    console.log(`[WebSocketTTS] Processing ${this.pendingTtsRequests.length} pending TTS requests`);
    
    const requests = [...this.pendingTtsRequests];
    this.pendingTtsRequests = [];
    
    requests.forEach(request => {
      this.speakText(request.text, request.voice, request.chat_id, request.onStart, request.onComplete, request.onError);
    });
  }

  // ✅ NEW: WebSocket connection management
  private async connectWebSocket(sessionId: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const wsUrl = `wss://${SUPABASE_URL.replace('https://', '')}/functions/v1/openai-tts-ws?sessionId=${sessionId}`;
        
        this.socket = new WebSocket(wsUrl);
        this.socket.binaryType = 'arraybuffer';

        this.socket.onopen = () => {
          console.log(`[WebSocketTTS] WebSocket connected for session: ${sessionId}`);
          this.connectionState.isConnected = true;
          this.connectionState.sessionId = sessionId;
          this.connectionState.lastPing = Date.now();
          
          // Mark as ready immediately (don't gate on audio unlock)
          this.connectionState.isReady = true;
          console.log('[WebSocketTTS] ✅ Connection ready for TTS requests');
          
          resolve(true);
        };

        this.socket.onmessage = this.handleWebSocketMessage.bind(this);

        this.socket.onerror = (error) => {
          console.error('[WebSocketTTS] WebSocket error:', error);
          this.connectionState.isConnected = false;
          this.connectionState.isReady = false;
          resolve(false);
        };

        this.socket.onclose = (event) => {
          console.log(`[WebSocketTTS] Connection closed: ${event.code} - ${event.reason}`);
          this.connectionState.isConnected = false;
          this.connectionState.isReady = false;
          
          // Attempt reconnection unless this was a clean close
          if (event.code !== 1000) {
            this.attemptReconnection();
          }
        };

      } catch (error) {
        console.error('[WebSocketTTS] Failed to create WebSocket:', error);
        resolve(false);
      }
    });
  }

  // ✅ NEW: Centralized message handling (Phase 2 - PCM)
  private handleWebSocketMessage(event: MessageEvent): void {
    if (event.data instanceof ArrayBuffer) {
      this.handlePcmChunk(event.data);
    } else if (event.data instanceof Blob) {
      // Blob fallback for compatibility
      event.data.arrayBuffer().then(buf => this.handlePcmChunk(buf));
    } else {
      this.handleJsonMessage(event.data);
    }
  }

  private handlePcmChunk(data: ArrayBuffer): void {
    if (!this.connectionState.isReady) {
      console.warn('[WebSocketTTS] Received PCM chunk but connection not ready, discarding');
      return;
    }
    
    // Convert ArrayBuffer to Int16Array for PCM data
    const int16Array = new Int16Array(data);
    
    // Clear the first-chunk watchdog on first chunk
    if (this.chunkCount === 0 && this.firstChunkTimeout) {
      clearTimeout(this.firstChunkTimeout);
      this.firstChunkTimeout = null;
      console.log('[WebSocketTTS] First PCM chunk received, watchdog cleared');
    }
    
    // Increment chunk counter
    this.chunkCount++;
    
    // Log first few chunks for debugging
    if (this.chunkCount <= 3) {
      console.log(`[WebSocketTTS] PCM chunk ${this.chunkCount}: ${int16Array.byteLength} bytes`);
    }
    
    // Write to PCM player (24kHz sample rate from OpenAI Realtime)
    this.pcmPlayer.writePcm(int16Array, 24000);
    
    // Start playback if not already playing
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.pcmPlayer.resume();
      this.currentTtsCallbacks?.onStart?.();
      console.log('[WebSocketTTS] PCM streaming started');
    }
  }

  private handleJsonMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'pong') {
        console.log('[WebSocketTTS] Health check pong received');
        this.connectionState.lastPing = Date.now();
      } else if (message.type === 'stream-start') {
        console.log('[WebSocketTTS] Stream started');
      } else if (message.type === 'stream-end') {
        console.log('[WebSocketTTS] Stream ended');
        this.streamEnded = true;
        this.isPlaying = false;
        this.pcmPlayer.pause();
        this.currentTtsCallbacks?.onComplete?.();
      } else if (message.error) {
        console.error('[WebSocketTTS] Server error:', message.error);
        this.currentTtsCallbacks?.onError?.(new Error(message.error));
      }
    } catch (e) {
      console.error('[WebSocketTTS] Failed to parse message:', e);
    }
  }

  // ✅ NEW: Reset TTS state for new request
  private resetTtsState(): void {
    this.streamEnded = false;
    this.isPlaying = false;
    this.currentTtsCallbacks = null;
    this.chunkCount = 0;
    
    // Clear any existing watchdog timer
    if (this.firstChunkTimeout) {
      clearTimeout(this.firstChunkTimeout);
      this.firstChunkTimeout = null;
    }
    
    // Reset PCM player
    this.pcmPlayer.pause();
  }

  // ✅ NEW: First-chunk watchdog timer
  private startFirstChunkWatchdog(): void {
    this.firstChunkTimeout = window.setTimeout(() => {
      console.error('[WebSocketTTS] No audio received within 2 seconds - watchdog timeout');
      this.currentTtsCallbacks?.onError?.(new Error('No audio received'));
    }, 2000);
  }

  // ✅ NEW: Get connection state
  public getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  // ✅ NEW: Check if ready for TTS
  public isReadyForTts(): boolean {
    return this.connectionState.isReady;
  }

  // ✅ NEW: Pause audio playback (for listening mode)
  public pausePlayback(): void {
    if (this.isPlaying) {
      this.pcmPlayer.pause();
      this.isPlaying = false;
      console.log('[WebSocketTTS] Audio playback paused');
    }
  }

  // ✅ NEW: Resume audio playback (after listening mode)
  public resumePlayback(): void {
    if (!this.isPlaying) {
      this.pcmPlayer.resume();
      this.isPlaying = true;
      console.log('[WebSocketTTS] Audio playback resumed');
    }
  }

  // Legacy method for backward compatibility
  public async speak(options: WebSocketTtsOptions): Promise<void> {
    if (!this.connectionState.isReady) {
      throw new Error('Connection not initialized. Call initializeConnection() first.');
    }
    
    return this.speakText(options.text, options.voice, options.chat_id, options.onStart, options.onComplete, options.onError);
  }

  // ✅ NEW: Cleanup with proper resource management
  public cleanup(): void {
    console.log('[WebSocketTTS] Cleaning up persistent connection');
    
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Close WebSocket
    this.disconnect();
    
    // Clear pending requests
    this.pendingTtsRequests = [];
    
    // Reset connection state
    this.connectionState = {
      isConnected: false,
      isReady: false,
      isAudioUnlocked: false,
      sessionId: null,
      reconnectAttempts: 0,
      lastPing: 0
    };
    
    // Cleanup PCM player
    this.pcmPlayer.cleanup();
  }

  // Private properties for current TTS request
  private currentTtsCallbacks: { onStart?: () => void, onComplete?: () => void, onError?: (error: Error) => void } | null = null;

  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connectionState.sessionId = null;
    this.connectionState.isConnected = false;
    this.connectionState.isReady = false;
  }
}

// Singleton instance
export const webSocketTtsService = new WebSocketTtsService();