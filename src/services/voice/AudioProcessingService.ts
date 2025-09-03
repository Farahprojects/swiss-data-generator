// Audio Processing Service
// Manages Web Worker for off-thread audio analysis

export class AudioProcessingService {
  private worker: Worker | null = null;
  private isReady = false;
  private listeners = new Set<(level: number) => void>();
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrameId: number | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      this.worker = new Worker('/audio-processor-worker.js');
      
      this.worker.onmessage = (e) => {
        const { type, level, timestamp } = e.data;
        
        switch (type) {
          case 'worker-ready':
            this.isReady = true;
            console.log('[AudioProcessingService] Worker ready');
            break;
            
          case 'audio-level':
            // Notify all listeners with the processed audio level
            this.listeners.forEach(listener => listener(level));
            break;
        }
      };

      this.worker.onerror = (error) => {
        console.error('[AudioProcessingService] Worker error:', error);
        this.isReady = false;
      };
    } catch (error) {
      console.error('[AudioProcessingService] Failed to create worker:', error);
      this.isReady = false;
    }
  }

  public setAnalyser(analyser: AnalyserNode) {
    this.analyser = analyser;
    this.dataArray = new Uint8Array(analyser.frequencyBinCount);
  }

  public startProcessing() {
    if (!this.isReady || !this.analyser || !this.worker) {
      console.warn('[AudioProcessingService] Not ready to start processing');
      return;
    }

    const processFrame = () => {
      if (!this.analyser || !this.dataArray || !this.worker) return;

      // Get frequency data
      this.analyser.getByteFrequencyData(this.dataArray);
      
      // Send to worker for processing
      this.worker.postMessage({
        type: 'process-audio',
        data: Array.from(this.dataArray) // Convert to regular array for worker
      });

      // Continue processing
      this.animationFrameId = requestAnimationFrame(processFrame);
    };

    processFrame();
  }

  public stopProcessing() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public subscribe(listener: (level: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public setThrottle(fps: number) {
    if (this.worker && this.isReady) {
      this.worker.postMessage({ type: 'set-throttle', data: { fps } });
    }
  }

  public setSmoothing(factor: number) {
    if (this.worker && this.isReady) {
      this.worker.postMessage({ type: 'set-smoothing', data: { factor } });
    }
  }

  public destroy() {
    this.stopProcessing();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.listeners.clear();
    this.isReady = false;
  }
}

// Singleton instance
export const audioProcessingService = new AudioProcessingService();
