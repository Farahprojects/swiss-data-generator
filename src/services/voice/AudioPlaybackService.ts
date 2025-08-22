class AudioPlaybackService {
  private audioElement: HTMLAudioElement | null = null;

  public play(audioUrl: string, onEnded: () => void): void {
    if (this.audioElement) {
      this.stop();
    }

    this.audioElement = new Audio(audioUrl);

    const handleEnded = () => {
      onEnded();
      this.stop();
    };

    const handleError = (e: Event) => {
      console.error('Audio playback error', e);
      onEnded(); // Still call onEnded to unblock the UI
      this.stop();
    };

    this.audioElement.addEventListener('ended', handleEnded);
    this.audioElement.addEventListener('error', handleError);
    
    this.audioElement.play().catch(e => {
      console.error('Failed to play audio:', e);
      handleError(e);
    });
  }

  public stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement.load();
      // Clean up event listeners
      this.audioElement.removeEventListener('ended', () => {});
      this.audioElement.removeEventListener('error', () => {});
      this.audioElement = null;
    }
  }
}

export const audioPlaybackService = new AudioPlaybackService();
