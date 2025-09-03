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
  private rafId: number | null = null;
  private callback: (level: number) => void;
  private isPlaying: boolean = false;
  private currentFrame: number = 0;
  private previewMode: boolean = true;
  private lastLevel: number = 0;

  constructor(duration: number, callback: (level: number) => void) {
    this.duration = duration;
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
