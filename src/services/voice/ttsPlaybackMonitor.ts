/**
 * TTS Playback Monitor - Real-time audio level tracking for AI speaking
 * Attaches to audio elements to provide visual feedback during TTS playback
 */

class TtsPlaybackMonitor {
  private currentAudioLevel = 0;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrame: number | null = null;
  private isMonitoring = false;

  /**
   * Attach monitor to an audio element and start tracking levels
   */
  attachToAudio(audioElement: HTMLAudioElement): void {
    try {
      // Create audio context if needed
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      }

      // Connect audio element to analyser
      const source = this.audioContext.createMediaElementSource(audioElement);
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      // Start monitoring
      this.isMonitoring = true;
      this.updateAudioLevel();
      
      console.log('[TtsPlaybackMonitor] Attached to audio element');
    } catch (error) {
      console.error('[TtsPlaybackMonitor] Failed to attach to audio:', error);
    }
  }

  /**
   * Get current audio level (0-1)
   */
  getCurrentAudioLevel(): number {
    return this.currentAudioLevel;
  }

  /**
   * Internal method to continuously update audio levels
   */
  private updateAudioLevel = (): void => {
    if (!this.isMonitoring || !this.analyser || !this.dataArray) {
      return;
    }

    // Get frequency data
    if (this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);
    }

    // Calculate RMS (root mean square) for audio level
    let sum = 0;
    const arrayLength = this.dataArray.length;
    for (let i = 0; i < arrayLength; i++) {
      const value = this.dataArray[i];
      sum += value * value;
    }
    const rms = Math.sqrt(sum / arrayLength);
    
    // Normalize to 0-1 range (255 is max value)
    this.currentAudioLevel = rms / 255;

    // Continue monitoring
    this.animationFrame = requestAnimationFrame(this.updateAudioLevel);
  };

  /**
   * Stop monitoring and cleanup resources
   */
  cleanup(): void {
    this.isMonitoring = false;
    this.currentAudioLevel = 0;

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    // Keep audio context for reuse, just disconnect
    this.analyser = null;
    this.dataArray = null;
    
    console.log('[TtsPlaybackMonitor] Cleanup complete');
  }
}

export const ttsPlaybackMonitor = new TtsPlaybackMonitor();
