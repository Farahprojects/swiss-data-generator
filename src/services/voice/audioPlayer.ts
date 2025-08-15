// src/services/voice/audioPlayer.ts
import { useChatStore } from '@/core/store';

class AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private onPlaybackEnd: (() => void) | null = null;

  play(audioUrl: string, onPlaybackEnd?: () => void) {
    console.log('[AudioPlayer] Attempting to play audio:', audioUrl);
    
    if (this.audio) {
      this.audio.pause();
    }

    this.audio = new Audio(audioUrl);
    this.onPlaybackEnd = onPlaybackEnd || null;

    this.audio.addEventListener('ended', this.handlePlaybackEnd);
    this.audio.addEventListener('error', this.handlePlaybackError);
    
    // Add more detailed error logging
    this.audio.addEventListener('loadstart', () => console.log('[AudioPlayer] Load started'));
    this.audio.addEventListener('loadeddata', () => console.log('[AudioPlayer] Data loaded'));
    this.audio.addEventListener('canplay', () => console.log('[AudioPlayer] Can play'));
    this.audio.addEventListener('error', (e) => {
      console.error('[AudioPlayer] Audio element error event:', e);
      console.error('[AudioPlayer] Audio error details:', {
        error: this.audio?.error,
        networkState: this.audio?.networkState,
        readyState: this.audio?.readyState,
        src: this.audio?.src
      });
    });

    // Disable mic while playing
    useChatStore.getState().setStatus('speaking');

    this.audio.play().catch(e => {
      console.error("[AudioPlayer] Error playing audio:", e);
      console.error("[AudioPlayer] Audio URL:", audioUrl);
      console.error("[AudioPlayer] Error type:", e.name);
      console.error("[AudioPlayer] Error message:", e.message);
      this.handlePlaybackError();
    });
  }

  pause() {
    if (this.audio) {
      this.audio.pause();
      useChatStore.getState().setStatus('idle');
    }
  }

  private handlePlaybackEnd = () => {
    useChatStore.getState().setStatus('idle');
    if (this.onPlaybackEnd) {
      this.onPlaybackEnd();
    }
    this.cleanup();
  };

  private handlePlaybackError = () => {
    useChatStore.getState().setError('Error playing audio.');
    this.cleanup();
  };

  private cleanup = () => {
    if (this.audio) {
      this.audio.removeEventListener('ended', this.handlePlaybackEnd);
      this.audio.removeEventListener('error', this.handlePlaybackError);
      this.audio = null;
    }
  }
}

export const audioPlayer = new AudioPlayer();
