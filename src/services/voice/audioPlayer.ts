// src/services/voice/audioPlayer.ts
import { useChatStore } from '@/core/store';

class AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private onPlaybackEnd: (() => void) | null = null;

  play(audioUrl: string, onPlaybackEnd?: () => void) {
    console.log('[AudioPlayer] Playing live audio (data URL - no storage)');
    
    if (this.audio) {
      this.audio.pause();
    }

    this.audio = new Audio(audioUrl);
    this.onPlaybackEnd = onPlaybackEnd || null;

    this.audio.addEventListener('ended', this.handlePlaybackEnd);
    this.audio.addEventListener('error', this.handlePlaybackError);
    
    // Simplified logging for live audio playback
    this.audio.addEventListener('loadstart', () => console.log('[AudioPlayer] Live audio load started'));
    this.audio.addEventListener('canplay', () => console.log('[AudioPlayer] Live audio ready to play'));

    // Set status to speaking
    useChatStore.getState().setStatus('speaking');

    this.audio.play().catch(e => {
      console.error("[AudioPlayer] Error playing live audio:", e);
      console.error("[AudioPlayer] This should not happen with data URLs");
      this.handlePlaybackError();
    });
  }

  pause() {
    console.log('[AudioPlayer] 🚨 EMERGENCY PAUSE - stopping audio immediately');
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0; // Reset to beginning
      useChatStore.getState().setStatus('idle');
    }
    // Clear any pending callbacks to prevent them from firing
    this.onPlaybackEnd = null;
    this.cleanup();
  }

  // Complete stop - more aggressive than pause
  stop() {
    console.log('[AudioPlayer] 🛑 EMERGENCY STOP - killing audio completely');
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.src = ''; // Clear the source
      this.audio.load(); // Force reload to clear buffer
    }
    this.onPlaybackEnd = null;
    this.cleanup();
    useChatStore.getState().setStatus('idle');
  }

  private handlePlaybackEnd = () => {
    console.log('[AudioPlayer] 🔊 Audio playback ended - onended event fired');
    useChatStore.getState().setStatus('idle');
    if (this.onPlaybackEnd) {
      console.log('[AudioPlayer] Calling onPlaybackEnd callback');
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
