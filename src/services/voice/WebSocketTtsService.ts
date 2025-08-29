// WebSocket-based TTS service for real-time MP3 streaming with persistent connections
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
  private audio: HTMLAudioElement;
  private mediaSource: MediaSource;
  private sourceBuffer: SourceBuffer | null = null;
  private chunks: Uint8Array[] = [];
  private isAppending = false;
  private streamEnded = false;
  private isPlaying = false;
  private hasFirstChunk = false; // Phase 1: Track first chunk for safe playback
  
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
      
      // Phase 1: Mark first chunk as appended
      if (!this.hasFirstChunk) {
        this.hasFirstChunk = true;
        console.log('[WebSocketTTS] First chunk appended, ready for playback');
      }
    } catch (e) {
      console.error('[WebSocketTTS] Error appending buffer:', e);
      this.isAppending = false;
    }
  };

  private handlePlaybackEnd = () => {
    console.log('[WebSocketTTS] MP3 audio playback ended');
    this.isPlaying = false;
  };

  // ✅ Web Audio context for unlocking (Phase 1)
  private audioContext: AudioContext | null = null;

  // ✅ Ensure audio context is unlocked by user gesture (Safari requirement)
  private async unlockAudioContext(): Promise<boolean> {
    if (this.connectionState.isAudioUnlocked) return true;
    
    try {
      // Create/resume Web Audio context
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = this.audioContext || new AudioCtx();
      
      await this.audioContext.resume().catch(() => {});
      
      // Optional: one-frame silent buffer to guarantee unlock on iOS
      const buf = this.audioContext.createBuffer(1, 1, 22050);
      const src = this.audioContext.createBufferSource();
      src.buffer = buf;
      src.connect(this.audioContext.destination);
      src.start(0);
      src.stop(0);
      
      this.connectionState.isAudioUnlocked = true;
      console.log('[WebSocketTTS] Web Audio context unlocked successfully');
      return true;
    } catch (error) {
      console.error('[WebSocketTTS] Failed to unlock audio context:', error);
      return false;
    }
  }

  // ✅ NEW: Initialize persistent connection early (Phase 1)
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

  // ✅ NEW: Initialize MediaSource (Phase 1 - no premature play())
  private initializeMediaSource(): void {
    // Ensure MediaSource is ready
    if (this.mediaSource.readyState === 'closed') {
      this.mediaSource = new MediaSource();
      this.audio.src = URL.createObjectURL(this.mediaSource);
      this.mediaSource.addEventListener('sourceopen', this.handleSourceOpen);
    }
    
    // Load the audio element (but don't play yet)
    this.audio.load();
    console.log('[WebSocketTTS] MediaSource initialized (ready for data)');
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

  // ✅ NEW: Centralized message handling
  private handleWebSocketMessage(event: MessageEvent): void {
    if (event.data instanceof ArrayBuffer) {
      this.handleAudioChunk(event.data);
    } else {
      this.handleJsonMessage(event.data);
    }
  }

  private handleAudioChunk(data: ArrayBuffer): void {
    if (!this.connectionState.isReady) {
      console.warn('[WebSocketTTS] Received audio chunk but connection not ready, discarding');
      return;
    }
    
    // Binary MP3 chunk - add to queue for streaming
    const chunk = new Uint8Array(data);
    this.chunks.push(chunk);
    this.processChunks();
    
    // Phase 1: Start playback only after first chunk is appended
    if (!this.isPlaying && this.hasFirstChunk) {
      this.startPlayback();
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
        this.endStream();
        this.currentTtsCallbacks?.onComplete?.();
      } else if (message.error) {
        console.error('[WebSocketTTS] Server error:', message.error);
        this.currentTtsCallbacks?.onError?.(new Error(message.error));
      }
    } catch (e) {
      console.error('[WebSocketTTS] Failed to parse message:', e);
    }
  }

  // ✅ NEW: Start audio playback
  private async startPlayback(): Promise<void> {
    try {
      await this.audio.play();
      this.isPlaying = true;
      this.currentTtsCallbacks?.onStart?.();
      console.log('[WebSocketTTS] MP3 streaming started');
    } catch (e) {
      console.error('[WebSocketTTS] Play failed:', e);
      this.currentTtsCallbacks?.onError?.(e as Error);
    }
  }

  // ✅ NEW: Reset TTS state for new request
  private resetTtsState(): void {
    this.chunks = [];
    this.isAppending = false;
    this.streamEnded = false;
    this.isPlaying = false;
    this.hasFirstChunk = false; // Phase 1: Reset first chunk flag
    this.currentTtsCallbacks = null;
    
    // Initialize MediaSource for new request
    this.initializeMediaSource();
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
      this.audio.pause();
      this.isPlaying = false;
      console.log('[WebSocketTTS] Audio playback paused');
    }
  }

  // ✅ NEW: Resume audio playback (after listening mode)
  public resumePlayback(): void {
    if (!this.isPlaying && this.audio.paused) {
      this.audio.play().then(() => {
        this.isPlaying = true;
        console.log('[WebSocketTTS] Audio playback resumed');
      }).catch((error) => {
        console.error('[WebSocketTTS] Failed to resume playback:', error);
      });
    }
  }

  // ✅ NEW: Clean older chunks to prevent memory buildup
  public cleanOldChunks(): void {
    if (this.sourceBuffer && !this.sourceBuffer.updating && this.chunks.length > 10) {
      // Keep only the last 10 chunks to prevent memory issues
      const chunksToRemove = this.chunks.length - 10;
      this.chunks.splice(0, chunksToRemove);
      console.log(`[WebSocketTTS] Cleaned ${chunksToRemove} old chunks`);
    }
  }

  // Legacy method for backward compatibility
  public async speak(options: WebSocketTtsOptions): Promise<void> {
    if (!this.connectionState.isReady) {
      throw new Error('Connection not initialized. Call initializeConnection() first.');
    }
    
    return this.speakText(options.text, options.voice, options.chat_id, options.onStart, options.onComplete, options.onError);
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
    
    // Cleanup audio resources
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