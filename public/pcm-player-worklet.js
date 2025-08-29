// PCM Player AudioWorklet Processor
// Handles real-time PCM streaming with ring buffer for low latency

class PcmPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    
    // Ring buffer for PCM frames (Float32, mono)
    this.ringBuffer = new Float32Array(8192); // 2 seconds at 48kHz
    this.readIndex = 0;
    this.writeIndex = 0;
    this.bufferSize = this.ringBuffer.length;
    
    // Audio level tracking
    this.levelAccumulator = 0;
    this.levelCount = 0;
    
    // Handle messages from main thread
    this.port.onmessage = (event) => {
      const { type, data } = event.data;
      
      if (type === 'pcm-data') {
        this.writePcmData(data);
      } else if (type === 'reset') {
        this.reset();
      }
    };
  }
  
  writePcmData(pcmFrames) {
    // Write PCM frames to ring buffer
    for (let i = 0; i < pcmFrames.length; i++) {
      this.ringBuffer[this.writeIndex] = pcmFrames[i];
      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
    }
  }
  
  reset() {
    this.readIndex = 0;
    this.writeIndex = 0;
    this.ringBuffer.fill(0);
    this.levelAccumulator = 0;
    this.levelCount = 0;
  }
  
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const channel = output[0];
    
    if (!channel) return true;
    
    let rmsSum = 0;
    let samplesProcessed = 0;
    
    // Fill output buffer with PCM data from ring buffer
    for (let i = 0; i < channel.length; i++) {
      if (this.readIndex !== this.writeIndex) {
        // Data available
        channel[i] = this.ringBuffer[this.readIndex];
        this.readIndex = (this.readIndex + 1) % this.bufferSize;
        
        // Accumulate for RMS calculation
        rmsSum += channel[i] * channel[i];
        samplesProcessed++;
      } else {
        // No data available, output silence
        channel[i] = 0;
      }
    }
    
    // Calculate and report audio level
    if (samplesProcessed > 0) {
      this.levelAccumulator += rmsSum;
      this.levelCount += samplesProcessed;
      
      // Report level every 128 samples (about every 3ms at 48kHz)
      if (this.levelCount >= 128) {
        const rms = Math.sqrt(this.levelAccumulator / this.levelCount);
        this.port.postMessage({
          type: 'level',
          rms: rms,
          samplesProcessed: this.levelCount
        });
        
        this.levelAccumulator = 0;
        this.levelCount = 0;
      }
    }
    
    return true;
  }
}

registerProcessor('pcm-player-processor', PcmPlayerProcessor);
