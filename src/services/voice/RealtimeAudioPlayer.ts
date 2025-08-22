import { supabase } from '@/integrations/supabase/client';
import { streamPlayerService, StreamPlayerService } from '@/services/voice/StreamPlayerService';

class RealtimeAudioPlayer {
  private channel: any | null = null;
  private streamPlayer: StreamPlayerService;
  private currentMessageId: string | null = null;
  private onPlaybackComplete: (() => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  private audioBuffer: string = '';

  constructor(streamPlayer: StreamPlayerService) {
    this.streamPlayer = streamPlayer;
  }

  public async play(sessionId: string, messageId: string, onPlaybackComplete: () => void, onError: (error: string) => void) {
    if (this.channel) {
      this.stop();
    }
    
    this.currentMessageId = messageId;
    this.onPlaybackComplete = onPlaybackComplete;
    this.onError = onError;

    // Start the player immediately, it will wait for data.
    const streamController = this.streamPlayer.getStreamController(onPlaybackComplete);

    this.channel = supabase.channel(`tts-audio-${sessionId}`);
    
    this.channel
      .on('broadcast', { event: 'audio-chunk' }, ({ payload }: { payload: any }) => {
        if (payload.messageId === this.currentMessageId) {
          // Decode base64 chunk and push to the stream player
          const byteCharacters = atob(payload.chunk);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          streamController.enqueue(byteArray);

          if (payload.isLast) {
            streamController.close();
            this.stop();
          }
        }
      })
      .on('broadcast', { event: 'audio-error' }, ({ payload }: { payload: any }) => {
        if (payload.messageId === this.currentMessageId) {
          console.error('TTS Streaming Error:', payload.error);
          this.stop();
          if (this.onError) {
            this.onError(payload.error);
          }
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[RealtimeAudioPlayer] Subscribed to channel tts-audio-${sessionId}`);
        }
      });
  }
  
  public stop() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
      console.log('[RealtimeAudioPlayer] Unsubscribed and channel removed.');
    }
    // The stream player is managed by its own lifecycle now.
    // this.streamPlayer.stop(); 
    this.currentMessageId = null;
    this.onPlaybackComplete = null;
    this.onError = null;
  }
}

export const realtimeAudioPlayer = new RealtimeAudioPlayer(streamPlayerService);
