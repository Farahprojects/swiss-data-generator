// TempAudioService - Handles temp_audio table subscriptions and MP3 playback
import { supabase } from '@/integrations/supabase/client';

export interface TempAudioCallbacks {
  onAudioReceived?: (audioData: ArrayBuffer) => void;
  onError?: (error: string) => void;
  onPlaybackComplete?: () => void;
}

export class TempAudioService {
  private chat_id: string | null = null;
  private subscription: any = null;
  private audio: HTMLAudioElement | null = null;
  private callbacks: TempAudioCallbacks = {};

  constructor(callbacks: TempAudioCallbacks = {}) {
    this.callbacks = callbacks;
  }

  // Subscribe to temp_audio table updates for a chat
  public subscribeToSession(chat_id: string): void {
    if (this.subscription) {
      this.unsubscribe();
    }

    this.chat_id = chat_id;
    console.log(`[TempAudio] 🎧 Subscribing to temp_audio updates for chat: ${chat_id}`);
    console.log(`[TempAudio] 📊 Database indexes available for fast audio delivery`);

    this.subscription = supabase
      .channel(`temp-audio:${chat_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'temp_audio',
          filter: `chat_id=eq.${chat_id}`,
        },
        (payload) => {
          const startTime = performance.now();
          console.log(`[TempAudio] 🔄 Received audio UPDATE for chat ${chat_id} at ${new Date().toISOString()}`);
          console.log(`[TempAudio] 📦 Payload size: ${JSON.stringify(payload).length} bytes`);
          this.handleAudioUpdate(payload, startTime);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'temp_audio',
          filter: `chat_id=eq.${chat_id}`,
        },
        (payload) => {
          const startTime = performance.now();
          console.log(`[TempAudio] 🆕 Received new audio INSERT for chat ${chat_id} at ${new Date().toISOString()}`);
          console.log(`[TempAudio] 📦 Payload size: ${JSON.stringify(payload).length} bytes`);
          this.handleAudioUpdate(payload, startTime);
        }
      )
      .subscribe((status) => {
        console.log(`[TempAudio] 🔌 WebSocket subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log(`[TempAudio] ✅ Successfully subscribed to temp_audio updates for chat: ${chat_id}`);
          console.log(`[TempAudio] 🚀 Ready for instant audio delivery via indexed database queries`);
        } else if (status === 'TIMED_OUT') {
          console.error(`[TempAudio] ⏰ Subscription timed out for chat: ${chat_id}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[TempAudio] ❌ Channel error for chat: ${chat_id}`);
        }
      });
  }

  // Handle audio updates from the database
  private async handleAudioUpdate(payload: any, startTime?: number): Promise<void> {
    try {
      const processingStart = performance.now();
      const deliveryLatency = startTime ? processingStart - startTime : 0;
      
      console.log(`[TempAudio] 🎯 Processing audio update (delivery latency: ${deliveryLatency.toFixed(2)}ms)`);
      
      const audioData = payload.new?.audio_data;
      if (!audioData) {
        console.warn('[TempAudio] ⚠️ No audio data in payload');
        return;
      }

      // Convert base64 to ArrayBuffer
      const decodeStart = performance.now();
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const decodeTime = performance.now() - decodeStart;

      console.log(`[TempAudio] ✅ Audio data processed: ${bytes.length} bytes in ${decodeTime.toFixed(2)}ms`);
      console.log(`[TempAudio] 🔊 Sending audio to browser for immediate playback`);
      
      // Call the callback with the audio data
      this.callbacks.onAudioReceived?.(bytes.buffer);
      
      // Play the audio immediately
      const playbackStart = performance.now();
      await this.playAudio(bytes.buffer);
      const playbackTime = performance.now() - playbackStart;
      
      const totalTime = performance.now() - processingStart;
      console.log(`[TempAudio] 🎵 Audio playback initiated in ${playbackTime.toFixed(2)}ms (total: ${totalTime.toFixed(2)}ms)`);
      
    } catch (error) {
      console.error('[TempAudio] ❌ Error handling audio update:', error);
      this.callbacks.onError?.(`Failed to process audio: ${error}`);
    }
  }

  // Play MP3 audio immediately in browser
  private async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      const playbackStart = performance.now();
      
      // Create blob URL for the audio
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);

      console.log(`[TempAudio] 🎧 Created audio blob URL: ${audioUrl.substring(0, 50)}...`);

      // Create and configure audio element
      this.audio = new Audio(audioUrl);
      this.audio.crossOrigin = 'anonymous';
      this.audio.preload = 'auto'; // Ensure immediate loading
      
      this.audio.addEventListener('loadstart', () => {
        console.log('[TempAudio] 📥 Audio loading started');
      });

      this.audio.addEventListener('canplay', () => {
        const loadTime = performance.now() - playbackStart;
        console.log(`[TempAudio] 🎼 Audio ready to play in ${loadTime.toFixed(2)}ms`);
      });
      
      this.audio.addEventListener('ended', () => {
        const totalTime = performance.now() - playbackStart;
        console.log(`[TempAudio] ✅ Audio playback completed in ${totalTime.toFixed(2)}ms`);
        URL.revokeObjectURL(audioUrl); // Clean up blob URL
        this.callbacks.onPlaybackComplete?.();
      });

      this.audio.addEventListener('error', (error) => {
        console.error('[TempAudio] ❌ Audio playback error:', error);
        URL.revokeObjectURL(audioUrl);
        this.callbacks.onError?.('Audio playback failed');
      });

      console.log('[TempAudio] 🚀 Starting audio playback in browser...');
      await this.audio.play();
      
      const startTime = performance.now() - playbackStart;
      console.log(`[TempAudio] 🔊 Audio playback started in ${startTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('[TempAudio] ❌ Error playing audio:', error);
      this.callbacks.onError?.(`Failed to play audio: ${error}`);
    }
  }

  // Unsubscribe from updates
  public unsubscribe(): void {
    if (this.subscription) {
      console.log(`[TempAudio] Unsubscribing from temp_audio updates for chat: ${this.chat_id}`);
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
        .from('temp_audio')
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
export const tempAudioService = new TempAudioService();
