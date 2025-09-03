// Audio Processing Web Worker
// Handles heavy audio analysis off the main UI thread

class AudioProcessor {
  constructor() {
    this.throttleMs = 50; // 20fps max
    this.lastUpdate = 0;
    this.smoothingFactor = 0.8;
    this.currentLevel = 0;
  }

  processAudioData(frequencyData) {
    const now = performance.now();
    if (now - this.lastUpdate < this.throttleMs) return;

    // Heavy math - isolated from UI thread
    const average = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
    const rawLevel = average / 255;
    

    
    // Apply smoothing
    this.currentLevel = this.currentLevel * this.smoothingFactor + rawLevel * (1 - this.smoothingFactor);
    
    // Only emit if there's meaningful audio
    if (this.currentLevel > 0.02) {
      self.postMessage({
        type: 'audio-level',
        level: this.currentLevel,
        timestamp: now
      });
    } else {
      // Emit zero during silence
      self.postMessage({
        type: 'audio-level',
        level: 0,
        timestamp: now
      });
    }
    
    this.lastUpdate = now;
  }

  setThrottle(fps) {
    this.throttleMs = 1000 / fps;
  }

  setSmoothing(factor) {
    this.smoothingFactor = Math.max(0, Math.min(1, factor));
  }
}

const processor = new AudioProcessor();

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'process-audio':
      processor.processAudioData(data);
      break;
      
    case 'set-throttle':
      processor.setThrottle(data.fps);
      break;
      
    case 'set-smoothing':
      processor.setSmoothing(data.factor);
      break;
      
    case 'ping':
      self.postMessage({ type: 'pong' });
      break;
  }
};

// Notify main thread that worker is ready
self.postMessage({ type: 'worker-ready' });
