
export class AudioUtils {
  private static worker: Worker | null = null;

  static async initializeWorker(): Promise<Worker> {
    if (!this.worker) {
      this.worker = new Worker(new URL('../workers/audioProcessor.ts', import.meta.url), {
        type: 'module'
      });
    }
    return this.worker;
  }

  static async processAudioWithWorker(audioChunks: Blob[]): Promise<string> {
    const worker = await this.initializeWorker();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Audio processing timeout'));
      }, 30000); // 30 second timeout

      worker.onmessage = (event) => {
        clearTimeout(timeout);
        const { type, data } = event.data;
        
        if (type === 'BASE64_RESULT') {
          resolve(data.base64Audio);
        } else if (type === 'ERROR') {
          reject(new Error(data.error));
        }
      };

      worker.postMessage({
        type: 'CONVERT_TO_BASE64',
        data: { audioChunks }
      });
    });
  }

  static optimizeAudioContext(sampleRate: number = 48000): AudioContext {
    return new AudioContext({
      sampleRate,
      latencyHint: 'interactive'
    });
  }

  static createOptimizedAnalyser(audioContext: AudioContext): AnalyserNode {
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024; // Reduced from 2048 for better performance
    analyser.smoothingTimeConstant = 0.3; // Faster response
    return analyser;
  }

  static calculateRMSEfficient(dataArray: Uint8Array): number {
    let sum = 0;
    const length = dataArray.length;
    
    // Process in chunks for better performance
    for (let i = 0; i < length; i += 4) {
      const val1 = dataArray[i] || 0;
      const val2 = dataArray[i + 1] || 0;
      const val3 = dataArray[i + 2] || 0;
      const val4 = dataArray[i + 3] || 0;
      
      sum += val1 * val1 + val2 * val2 + val3 * val3 + val4 * val4;
    }
    
    return Math.sqrt(sum / length);
  }

  static debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  static cleanup(mediaRecorder: MediaRecorder | null, audioContext: AudioContext | null) {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream?.getTracks().forEach(track => track.stop());
    }
    
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
    }
  }
}
