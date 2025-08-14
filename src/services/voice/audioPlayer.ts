// src/services/voice/audioPlayer.ts
import { useChatStore } from '@/core/store';

class AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private onPlaybackEnd: (() => void) | null = null;

  play(audioUrl: string, onPlaybackEnd?: () => void) {
    if (this.audio) {
      this.audio.pause();
    }

    this.audio = new Audio(audioUrl);
    this.onPlaybackEnd = onPlaybackEnd || null;

    this.audio.addEventListener('ended', this.handlePlaybackEnd);
    this.audio.addEventListener('error', this.handlePlaybackError);

    // Disable mic while playing
    useChatStore.getState().setStatus('speaking');

    this.audio.play().catch(e => {
      console.error("Error playing audio:", e);
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
