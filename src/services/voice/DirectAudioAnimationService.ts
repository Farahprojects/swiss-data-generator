// Direct Audio Animation Service
// Bypasses React state entirely for smooth, GPU-accelerated animations

export class DirectAudioAnimationService {
  private listeners = new Set<(level: number) => void>();
  private isProcessing = false;

  // Subscribe to audio level updates
  public subscribe(listener: (level: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners (called by AudioProcessingService)
  public notifyAudioLevel(level: number): void {
    if (this.isProcessing) {
      this.listeners.forEach(listener => listener(level));
    }
  }

  // Start processing
  public start(): void {
    this.isProcessing = true;
  }

  // Stop processing
  public stop(): void {
    this.isProcessing = false;
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
