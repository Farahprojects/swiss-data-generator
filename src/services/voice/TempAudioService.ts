// ChatAudioService - Handles chat_audio_clips table subscriptions and MP3 URL playback
import { supabase } from '@/integrations/supabase/client';

export interface ChatAudioCallbacks {
  onAudioReceived?: (audioUrl: string) => void;
  onError?: (error: string) => void;
  onPlaybackComplete?: () => void;
}

export class ChatAudioService {
  private chat_id: string | null = null;
  private subscription: any = null;
  private audio: HTMLAudioElement | null = null;
  private callbacks: ChatAudioCallbacks = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isReconnecting = false;

  constructor(callbacks: ChatAudioCallbacks = {}) {
    this.callbacks = callbacks;
  }

  // Subscribe to chat_audio_clips table updates for a chat
  public subscribeToSession(chat_id: string): void {
    if (this.subscription) {
      this.unsubscribe();
    }

    this.chat_id = chat_id;
    console.log(`[ChatAudio] 🔌 WebSocket: Subscribing to chat_audio_clips table for chat: ${chat_id}`);

    this.subscription = supabase
      .channel(`chat-audio:${chat_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_audio_clips',
          filter: `chat_id=eq.${chat_id}`,
        },
        (payload) => {
          const startTime = performance.now();
          console.log(`[ChatAudio] 📡 WebSocket: Found UPDATE in chat_audio_clips table for chat ${chat_id}`);
          this.handleAudioUpdate(payload, startTime);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_audio_clips',
          filter: `chat_id=eq.${chat_id}`,
        },
        (payload) => {
          const startTime = performance.now();
          console.log(`[ChatAudio] 📡 WebSocket: Found INSERT in chat_audio_clips table for chat ${chat_id}`);
          this.handleAudioUpdate(payload, startTime);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[ChatAudio] ✅ WebSocket: Connected to chat_audio_clips table for chat: ${chat_id}`);
          this.reconnectAttempts = 0; // Reset reconnect counter on successful connection
          this.isReconnecting = false;
        } else if (status === 'TIMED_OUT') {
          console.error(`[ChatAudio] ⏰ WebSocket: Subscription timed out for chat: ${chat_id}`);
          this.handleConnectionFailure();
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[ChatAudio] ❌ WebSocket: Channel error for chat: ${chat_id}`);
          this.handleConnectionFailure();
        } else if (status === 'CLOSED') {
          console.warn(`[ChatAudio] 🔌 WebSocket: Connection closed for chat: ${chat_id}`);
          this.handleConnectionFailure();
        }
      });
  }

  // Handle audio updates from the database
  private async handleAudioUpdate(payload: any, startTime?: number): Promise<void> {
    try {
      const processingStart = performance.now();
      const deliveryLatency = startTime ? processingStart - startTime : 0;
      
      const audioUrl = payload.new?.audio_url;
      if (!audioUrl) {
        console.warn('[ChatAudio] ❌ No audio URL found in table payload');
        return;
      }

      console.log(`[ChatAudio] 🎵 Processing audio URL from table: ${audioUrl}`);

      // Call the callback with the audio URL
      this.callbacks.onAudioReceived?.(audioUrl);
      console.log(`[ChatAudio] 🎧 Sending audio URL to browser for playback...`);
      
      // Play the audio immediately
      const playbackStart = performance.now();
      await this.playAudioFromUrl(audioUrl);
      const playbackTime = performance.now() - playbackStart;
      
      const totalTime = performance.now() - processingStart;
      console.log(`[ChatAudio] 🎵 Audio playback initiated in ${playbackTime.toFixed(2)}ms (total: ${totalTime.toFixed(2)}ms)`);
      
          } catch (error) {
        console.error('[ChatAudio] ❌ Error handling audio update:', error);
        this.callbacks.onError?.(`Failed to process audio: ${error}`);
      }
  }

  // Play MP3 audio from URL immediately in browser
  private async playAudioFromUrl(audioUrl: string): Promise<void> {
    try {
      const playbackStart = performance.now();
      
      console.log(`[ChatAudio] 🎧 Playing audio from URL: ${audioUrl.substring(0, 100)}...`);

      // Create and configure audio element
      this.audio = new Audio(audioUrl);
      this.audio.crossOrigin = 'anonymous';
      this.audio.preload = 'auto'; // Ensure immediate loading
      
      this.audio.addEventListener('loadstart', () => {
        console.log('[ChatAudio] 📥 Audio loading started');
      });

      this.audio.addEventListener('canplay', () => {
        const loadTime = performance.now() - playbackStart;
        console.log(`[ChatAudio] 🎼 Audio ready to play in ${loadTime.toFixed(2)}ms`);
      });
      
      this.audio.addEventListener('ended', () => {
        const totalTime = performance.now() - playbackStart;
        console.log(`[ChatAudio] ✅ Audio playback completed in ${totalTime.toFixed(2)}ms`);
        this.callbacks.onPlaybackComplete?.();
      });

      this.audio.addEventListener('error', (error) => {
        console.error('[ChatAudio] ❌ Audio playback error:', error);
        this.callbacks.onError?.('Audio playback failed');
      });

      console.log('[ChatAudio] 🚀 Starting audio playback in browser...');
      await this.audio.play();
      
      const startTime = performance.now() - playbackStart;
      console.log(`[ChatAudio] 🔊 Audio playback started in ${startTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('[ChatAudio] ❌ Error playing audio:', error);
      this.callbacks.onError?.(`Failed to play audio: ${error}`);
    }
  }
  
  // Handle connection failures and implement auto-reconnection
  private handleConnectionFailure(): void {
    if (this.isReconnecting || !this.chat_id) {
      return; // Already reconnecting or no chat_id to reconnect to
    }
    
    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.error(`[ChatAudio] ❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached for chat: ${this.chat_id}`);
      this.callbacks.onError?.('WebSocket connection failed after maximum retries');
      return;
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
    const backoffDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.warn(`[ChatAudio] 🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${backoffDelay}ms for chat: ${this.chat_id}`);
    
    this.reconnectTimeout = setTimeout(() => {
      if (this.chat_id && this.isReconnecting) {
        console.log(`[ChatAudio] 🔄 Reconnecting to chat_audio_clips table for chat: ${this.chat_id}`);
        this.subscribeToSession(this.chat_id);
      }
    }, backoffDelay);
  }
  // Unsubscribe from updates
  public unsubscribe(): void {
    // Clear any pending reconnection attempt
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    
    if (this.subscription) {
      console.log(`[ChatAudio] Unsubscribing from chat_audio_clips updates for chat: ${this.chat_id}`);
      supabase.removeChannel(this.subscription);
      this.subscription = null;
    }
    
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    
    this.chat_id = null;
  }

  // Clean up audio data for a chat (optional)
  public async cleanupSession(chat_id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_audio_clips')
        .delete()
        .eq('chat_id', chat_id);
      
      if (error) {
        console.error(`[TempAudio] Failed to cleanup chat ${chat_id}:`, error);
      } else {
        console.log(`[TempAudio] ✅ Cleaned up audio data for chat: ${chat_id}`);
      }
    } catch (error) {
      console.error(`[TempAudio] Error cleaning up chat ${chat_id}:`, error);
    }
  }

  // Get current chat ID
  public getCurrentChatId(): string | null {
    return this.chat_id;
  }

  // Check if subscribed
  public isSubscribed(): boolean {
    return this.subscription !== null;
  }
}

// Export singleton instance
export const chatAudioService = new ChatAudioService();
