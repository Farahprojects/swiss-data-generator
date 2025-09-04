// Direct Audio Animation Service
// Bypasses React state entirely for smooth, GPU-accelerated animations

export class DirectAudioAnimationService {
  private listeners = new Set<(levels: number[]) => void>();
  private isProcessing = false;
  private currentLevels = [0, 0, 0, 0]; // 4 bars

  // Subscribe to audio level updates (now receives array of 4 bar levels)
  public subscribe(listener: (levels: number[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners with 4-bar data
  public notifyAudioLevel(levels: number[]): void {
    if (levels.length === 4) {
      this.currentLevels = [...levels]; // Update current levels
      
      if (this.isProcessing) {
        this.listeners.forEach(listener => listener(this.currentLevels));
      }
    } else if (levels.length === 1) {
      // Backward compatibility: single level applied to all bars
      this.currentLevels = [levels[0], levels[0], levels[0], levels[0]];
      
      if (this.isProcessing) {
        this.listeners.forEach(listener => listener(this.currentLevels));
      }
    }
  }

  // Get current audio levels (returns array of 4 bar levels)
  public getCurrentLevels(): number[] {
    return [...this.currentLevels];
  }

  // Get current audio level (backward compatibility - returns first bar)
  public getCurrentLevel(): number {
    return this.currentLevels[0];
  }

  // Start processing
  public start(): void {
    this.isProcessing = true;
  }

  // Stop processing
  public stop(): void {
    this.isProcessing = false;
    this.currentLevels = [0, 0, 0, 0];
    // Reset all listeners to zero
    this.listeners.forEach(listener => listener([0, 0, 0, 0]));
  }

  // Clean up
  public destroy(): void {
    this.stop();
    this.listeners.clear();
  }
}

// Singleton instance
export const directAudioAnimationService = new DirectAudioAnimationService();
