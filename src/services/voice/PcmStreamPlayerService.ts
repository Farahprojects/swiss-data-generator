// PCM Stream Player Service using AudioWorklet
// Handles real-time PCM streaming with low latency

export interface PcmPlayerCallbacks {
  onLevel?: (rms: number) => void;
  onError?: (error: Error) => void;
}

export class PcmStreamPlayerService {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private isWorkletLoaded = false;
  private isPlaying = false;
  private callbacks: PcmPlayerCallbacks = {};
  
  // Resampling state
  private resampleBuffer: Float32Array | null = null;
  private lastSampleRate = 0;
  
  constructor(callbacks: PcmPlayerCallbacks = {}) {
    this.callbacks = callbacks;
  }
  
  // ✅ Ensure AudioWorklet is loaded
  public async ensureWorkletLoaded(audioContext: AudioContext): Promise<void> {
    if (this.isWorkletLoaded && this.audioContext === audioContext) {
      return;
    }
    
    try {
      this.audioContext = audioContext;
      
      // Load the AudioWorklet module
      await audioContext.audioWorklet.addModule('/pcm-player-worklet.js');
      
      // Create the AudioWorklet node
      this.workletNode = new AudioWorkletNode(audioContext, 'pcm-player-processor', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [1], // Mono output
      });
      
      // Connect to audio output
      this.workletNode.connect(audioContext.destination);
      
      // Handle messages from the worklet
      this.workletNode.port.onmessage = (event) => {
        const { type, rms } = event.data;
        
        if (type === 'level' && this.callbacks.onLevel) {
          this.callbacks.onLevel(rms);
        }
      };
      
      this.isWorkletLoaded = true;
      console.log('[PcmStreamPlayer] AudioWorklet loaded successfully');
      
    } catch (error) {
      console.error('[PcmStreamPlayer] Failed to load AudioWorklet:', error);
      throw error;
    }
  }
  
  // ✅ Write PCM data to the worklet
  public writePcm(int16Array: Int16Array, sampleRate: number): void {
    if (!this.workletNode || !this.isWorkletLoaded) {
      console.warn('[PcmStreamPlayer] Worklet not loaded, cannot write PCM data');
      return;
    }
    
    try {
      // Convert Int16 PCM [-32768..32767] to Float32 [-1..1]
      const float32Array = this.convertInt16ToFloat32(int16Array);
      
      // Resample if needed
      const resampledData = this.resampleIfNeeded(float32Array, sampleRate);
      
      // Send to worklet
      this.workletNode.port.postMessage({
        type: 'pcm-data',
        data: resampledData
      }, [resampledData.buffer]); // Transfer the buffer for zero-copy
      
    } catch (error) {
      console.error('[PcmStreamPlayer] Error writing PCM data:', error);
      this.callbacks.onError?.(error as Error);
    }
  }
  
  // ✅ Convert Int16 to Float32
  private convertInt16ToFloat32(int16Array: Int16Array): Float32Array {
    const float32Array = new Float32Array(int16Array.length);
    
    for (let i = 0; i < int16Array.length; i++) {
      // Convert Int16 [-32768..32767] to Float32 [-1..1]
      float32Array[i] = int16Array[i] / 32768.0;
    }
    
    return float32Array;
  }
  
  // ✅ Simple linear interpolation resampling
  private resampleIfNeeded(float32Array: Float32Array, sourceSampleRate: number): Float32Array {
    if (!this.audioContext) {
      return float32Array;
    }
    
    const targetSampleRate = this.audioContext.sampleRate;
    
    // No resampling needed
    if (Math.abs(sourceSampleRate - targetSampleRate) < 1) {
      return float32Array;
    }
    
    const ratio = targetSampleRate / sourceSampleRate;
    const targetLength = Math.round(float32Array.length * ratio);
    
    // Create or resize resample buffer
    if (!this.resampleBuffer || this.resampleBuffer.length < targetLength) {
      this.resampleBuffer = new Float32Array(targetLength);
    }
    
    // Simple linear interpolation
    for (let i = 0; i < targetLength; i++) {
      const sourceIndex = i / ratio;
      const sourceIndexFloor = Math.floor(sourceIndex);
      const sourceIndexCeil = Math.min(sourceIndexFloor + 1, float32Array.length - 1);
      const fraction = sourceIndex - sourceIndexFloor;
      
      const sample1 = float32Array[sourceIndexFloor];
      const sample2 = float32Array[sourceIndexCeil];
      
      this.resampleBuffer[i] = sample1 + (sample2 - sample1) * fraction;
    }
    
    return this.resampleBuffer.slice(0, targetLength);
  }
  
  // ✅ Pause playback
  public pause(): void {
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'reset' });
      this.isPlaying = false;
      console.log('[PcmStreamPlayer] Playback paused');
    }
  }
  
  // ✅ Resume playback
  public resume(): void {
    this.isPlaying = true;
    console.log('[PcmStreamPlayer] Playback resumed');
  }
  
  // ✅ Check if playing
  public get isActive(): boolean {
    return this.isPlaying && this.isWorkletLoaded;
  }
  
  // ✅ Cleanup
  public cleanup(): void {
    if (this.workletNode) {
      this.workletNode.port.postMessage({ type: 'reset' });
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    
    this.audioContext = null;
    this.isWorkletLoaded = false;
    this.isPlaying = false;
    this.resampleBuffer = null;
    
    console.log('[PcmStreamPlayer] Cleanup completed');
  }
}
