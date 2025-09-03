/**
 * 🎵 ENVELOPE PLAYER - Progressive, Mobile-First Animation
 * 
 * Handles progressive envelope data for instant speaking bar animation.
 * Starts with preview, builds up to full envelope for perfect sync.
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

  constructor(duration: number, callback: (level: number) => void) {
    this.duration = duration;
    this.callback = callback;
    this.startTime = performance.now();
  }

  /**
   * Start with preview envelope for immediate animation
   */
  public startWithPreview(previewLevel: number): void {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.previewMode = true;
    this.startTime = performance.now();
    
    // Start with preview level for instant bar movement
    this.callback(previewLevel);
    
    console.log(`[EnvelopePlayer] 🚀 Started with preview level: ${previewLevel.toFixed(3)}`);
  }

  /**
   * Add full envelope data progressively
   */
  public setFullEnvelope(fullEnvelope: number[]): void {
    this.envelope = fullEnvelope;
    this.previewMode = false;
    
    console.log(`[EnvelopePlayer] 📊 Full envelope loaded: ${fullEnvelope.length} frames`);
    
    // Start progressive playback if not already running
    if (this.isPlaying && !this.rafId) {
      this.startProgressivePlayback();
    }
  }

  /**
   * Start progressive envelope playback
   */
  private startProgressivePlayback(): void {
    if (this.rafId) return;
    
    const step = () => {
      if (!this.isPlaying || this.currentFrame >= this.envelope.length) {
        // Envelope complete
        this.callback(0);
        this.stop();
        return;
      }

      // Get current envelope level
      const level = this.envelope[this.currentFrame] || 0;
      
      // Send level to callback
      this.callback(level);
      
      // Move to next frame
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
  }

  /**
   * Destroy and cleanup
   */
  public destroy(): void {
    this.stop();
  }
}
