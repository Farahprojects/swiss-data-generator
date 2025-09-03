/**
 * 🎵 ENVELOPE PLAYER - Simple, Progressive Animation
 * 
 * Handles progressive envelope data for smooth speaking bar animation.
 * Simple, fast, no complex preview logic.
 */

export class EnvelopePlayer {
  private envelope: number[] = [];
  private rafId: number | null = null;
  private callback: (level: number) => void;
  private isPlaying: boolean = false;
  private currentFrame: number = 0;
  private lastLevel: number = 0;

  constructor(callback: (level: number) => void) {
    this.callback = callback;
  }

  /**
   * Set full envelope data for progressive playback
   */
  public setFullEnvelope(fullEnvelope: number[]): void {
    this.envelope = fullEnvelope;
    this.currentFrame = 0;
    this.lastLevel = 0;
    
    console.log(`[EnvelopePlayer] 📊 Envelope loaded: ${fullEnvelope.length} frames`);
    
    // Start progressive playback
    if (this.isPlaying && !this.rafId) {
      this.startProgressivePlayback();
    }
  }

  /**
   * Start progressive envelope playback with smooth interpolation
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

      // Get current envelope level
      const targetLevel = this.envelope[this.currentFrame] || 0;
      
      // Smooth interpolation between frames to prevent jerky animation
      const interpolatedLevel = this.lastLevel * 0.8 + targetLevel * 0.2;
      
      // Send interpolated level to callback
      this.callback(interpolatedLevel);
      
      // Update for next frame
      this.lastLevel = interpolatedLevel;
      this.currentFrame++;
      
      // Continue animation loop
      this.rafId = requestAnimationFrame(step);
    };
    
    this.rafId = requestAnimationFrame(step);
  }

  /**
   * Start playback
   */
  public start(): void {
    this.isPlaying = true;
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
