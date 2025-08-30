// TempAudioService - Handles temp_audio table subscriptions and MP3 playback
import { supabase } from '@/integrations/supabase/client';

export interface TempAudioCallbacks {
  onAudioReceived?: (audioData: ArrayBuffer) => void;
  onError?: (error: string) => void;
  onPlaybackComplete?: () => void;
}

export class TempAudioService {
  private sessionId: string | null = null;
  private subscription: any = null;
  private audio: HTMLAudioElement | null = null;
  private callbacks: TempAudioCallbacks = {};

  constructor(callbacks: TempAudioCallbacks = {}) {
    this.callbacks = callbacks;
  }

  // Subscribe to temp_audio table updates for a session
  public subscribeToSession(sessionId: string): void {
    if (this.subscription) {
      this.unsubscribe();
    }

    this.sessionId = sessionId;
    console.log(`[TempAudio] Subscribing to temp_audio updates for session: ${sessionId}`);

    this.subscription = supabase
      .channel(`temp-audio:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'temp_audio',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log(`[TempAudio] Received audio update for session ${sessionId}:`, payload);
          this.handleAudioUpdate(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'temp_audio',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log(`[TempAudio] Received new audio for session ${sessionId}:`, payload);
          this.handleAudioUpdate(payload);
        }
      )
      .subscribe((status) => {
        console.log(`[TempAudio] Subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log(`[TempAudio] ✅ Successfully subscribed to temp_audio updates for session: ${sessionId}`);
        }
      });
  }

  // Handle audio updates from the database
  private async handleAudioUpdate(payload: any): Promise<void> {
    try {
      const audioData = payload.new?.audio_data;
      if (!audioData) {
        console.warn('[TempAudio] No audio data in payload');
        return;
      }

      // Convert base64 to ArrayBuffer
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log(`[TempAudio] ✅ Audio data received: ${bytes.length} bytes`);
      
      // Call the callback with the audio data
      this.callbacks.onAudioReceived?.(bytes.buffer);
      
      // Play the audio
      await this.playAudio(bytes.buffer);
      
    } catch (error) {
      console.error('[TempAudio] Error handling audio update:', error);
      this.callbacks.onError?.(`Failed to process audio: ${error}`);
    }
  }

  // Play MP3 audio
  private async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      // Create blob URL for the audio
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);

      // Create and play audio
      this.audio = new Audio(audioUrl);
      this.audio.crossOrigin = 'anonymous';
      
      this.audio.addEventListener('ended', () => {
        console.log('[TempAudio] Audio playback completed');
        URL.revokeObjectURL(audioUrl); // Clean up blob URL
        this.callbacks.onPlaybackComplete?.();
      });

      this.audio.addEventListener('error', (error) => {
        console.error('[TempAudio] Audio playback error:', error);
        URL.revokeObjectURL(audioUrl);
        this.callbacks.onError?.('Audio playback failed');
      });

      console.log('[TempAudio] Starting audio playback...');
      await this.audio.play();
      
    } catch (error) {
      console.error('[TempAudio] Error playing audio:', error);
      this.callbacks.onError?.(`Failed to play audio: ${error}`);
    }
  }

  // Unsubscribe from updates
  public unsubscribe(): void {
    if (this.subscription) {
      console.log(`[TempAudio] Unsubscribing from temp_audio updates for session: ${this.sessionId}`);
      supabase.removeChannel(this.subscription);
      this.subscription = null;
    }
    
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    
    this.sessionId = null;
  }

  // Clean up audio data for a session (optional)
  public async cleanupSession(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('temp_audio')
        .delete()
        .eq('session_id', sessionId);
      
      if (error) {
        console.error(`[TempAudio] Failed to cleanup session ${sessionId}:`, error);
      } else {
        console.log(`[TempAudio] ✅ Cleaned up audio data for session: ${sessionId}`);
      }
    } catch (error) {
      console.error(`[TempAudio] Error cleaning up session ${sessionId}:`, error);
    }
  }

  // Get current session ID
  public getCurrentSessionId(): string | null {
    return this.sessionId;
  }

  // Check if subscribed
  public isSubscribed(): boolean {
    return this.subscription !== null;
  }
}

// Export singleton instance
export const tempAudioService = new TempAudioService();
