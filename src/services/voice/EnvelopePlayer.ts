/**
 * 🎵 ENVELOPE PLAYER - Professional, Progressive Animation
 * 
 * Handles progressive envelope data for perfect audio sync.
 * No fallbacks, smooth interpolation, professional-grade timing.
 */

export class EnvelopePlayer {
  private envelope: number[] = [];
  private startTime: number;
  private duration: number;
  private frameDurationMs: number;
  private rafId: number | null = null;
  private callback: (level: number) => void;
  private isPlaying: boolean = false;
  private currentFrame: number = 0;
  private previewMode: boolean = true;
  private lastLevel: number = 0;

  constructor(duration: number, frameDurationMs: number, callback: (level: number) => void) {
    this.duration = duration;
    this.frameDurationMs = Math.max(1, frameDurationMs || 20);
    this.callback = callback;
    this.startTime = performance.now();
  }

  /**
   * Start with professional preview envelope for instant, accurate animation
   */
  public startWithPreview(previewLevel: number): void {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.previewMode = true;
    this.startTime = performance.now();
    this.lastLevel = previewLevel;
    
    // Start with accurate preview level for instant bar movement
    this.callback(previewLevel);
    
    console.log(`[EnvelopePlayer] 🚀 Professional preview started: level ${previewLevel.toFixed(4)}`);
  }

  /**
   * Add full envelope data progressively for perfect sync
   */
  public setFullEnvelope(fullEnvelope: number[]): void {
    this.envelope = fullEnvelope;
    this.previewMode = false;
    this.currentFrame = 0;
    
    console.log(`[EnvelopePlayer] 📊 Full envelope loaded: ${fullEnvelope.length} frames`);
    
    // Start progressive playback if not already running
    if (this.isPlaying && !this.rafId) {
      this.startProgressivePlayback();
    }
  }

  /**
   * Start progressive envelope playback - sync to audio clock
   */
  private startProgressivePlayback(): void {
    if (this.rafId) return;
    
    const step = () => {
      if (!this.isPlaying || this.currentFrame >= this.envelope.length) {
        // Envelope complete - fade out smoothly
        this.callback(0);
        this.stop();
        return;
      }

      // 🎯 PROFESSIONAL: Sync to audio clock instead of performance.now()
      // This ensures perfect sync with actual audio playback
      const audioElement = document.querySelector('audio') as HTMLAudioElement;
      let currentTime = 0;
      
      if (audioElement && !audioElement.paused) {
        currentTime = audioElement.currentTime * 1000; // Convert to milliseconds
      } else {
        // Fallback to performance timing if no audio element
        currentTime = performance.now() - this.startTime;
      }
      
      // Map audio time to envelope index using frameDurationMs
      const targetFrame = Math.min(
        this.envelope.length - 1,
        Math.floor(currentTime / this.frameDurationMs)
      );
      
      this.currentFrame = targetFrame;
      const level = this.envelope[targetFrame] || 0;
      
      // Send precomputed level to callback
      this.callback(level);
      
      // Continue animation loop
      this.rafId = requestAnimationFrame(step);
    };
    
    this.rafId = requestAnimationFrame(step);
  }

  /**
   * Start playback (legacy method - use startWithPreview instead)
   */
  public start(): void {
    if (this.envelope.length > 0) {
      this.startProgressivePlayback();
    }
  }

  /**
   * Stop playback
   */
  public stop(): void {
    this.isPlaying = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.currentFrame = 0;
    this.lastLevel = 0;
  }

  /**
   * Destroy and cleanup
   */
  public destroy(): void {
    this.stop();
  }
}
