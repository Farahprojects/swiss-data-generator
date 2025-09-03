// Direct Audio Animation Service
// Bypasses React state entirely for smooth, GPU-accelerated animations

export class DirectAudioAnimationService {
  private listeners = new Set<(level: number) => void>();
  private isProcessing = false;
  private currentLevel = 0;

  // Subscribe to audio level updates
  public subscribe(listener: (level: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners (called by AudioProcessingService)
  public notifyAudioLevel(level: number): void {
    this.currentLevel = level;
    if (this.isProcessing) {
      this.listeners.forEach(listener => listener(level));
    }
  }

  // Get current audio level
  public getCurrentLevel(): number {
    return this.currentLevel;
  }

  // Start processing
  public start(): void {
    this.isProcessing = true;
  }

  // Stop processing
  public stop(): void {
    this.isProcessing = false;
    this.currentLevel = 0;
    // Reset all listeners to zero
    this.listeners.forEach(listener => listener(0));
  }

  // Clean up
  public destroy(): void {
    this.stop();
    this.listeners.clear();
  }
}

// Singleton instance
export const directAudioAnimationService = new DirectAudioAnimationService();
