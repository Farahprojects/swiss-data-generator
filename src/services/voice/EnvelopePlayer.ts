/**
 * 🎵 ENVELOPE PLAYER - Mobile-First, GPU-Driven Animation
 * 
 * Handles envelope data playback in sync with audio duration.
 * No setTimeout, no drift, no missed frames.
 */

export class EnvelopePlayer {
  private envelope: number[];
  private startTime: number;
  private duration: number;
  private rafId: number | null = null;
  private callback: (value: number) => void;
  private isPlaying: boolean = false;

  constructor(envelope: number[], duration: number, cb: (v: number) => void) {
    this.envelope = envelope;
    this.duration = duration;
    this.callback = cb;
    this.startTime = performance.now();
  }

  start() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.startTime = performance.now();
    
    const step = () => {
      if (!this.isPlaying) return;
      
      const now = performance.now();
      const t = (now - this.startTime) / this.duration;
      
      if (t >= 1) {
        // Envelope complete
        this.callback(0);
        this.stop();
        return;
      }

      // Map progress → index in envelope array
      const idx = Math.floor(t * this.envelope.length);
      const value = this.envelope[idx] || 0;
      
      // Send envelope value to callback
      this.callback(value);

      // Continue animation loop
      this.rafId = requestAnimationFrame(step);
    };
    
    this.rafId = requestAnimationFrame(step);
  }

  stop() {
    this.isPlaying = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy() {
    this.stop();
  }
}
