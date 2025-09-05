/**
 * 🎯 VAD WEB WORKER - Offload VAD analysis from UI thread
 * 
 * Lightweight worker for energy-based voice activity detection.
 * Keeps UI thread free for smooth animations.
 */

// VAD configuration
let config = {
  voiceThreshold: 0.01,
  silenceThreshold: 0.005,
  silenceTimeoutMs: 1500,
  bufferWindowMs: 200
};

// VAD state
let state = {
  isRecording: false,
  silenceStartTime: null,
  lastVoiceTime: 0
};

// Sliding buffer
let audioBuffer = new Float32Array(3200); // 200ms at 16kHz
let bufferIndex = 0;
let bufferFull = false;

/**
 * Calculate RMS energy from audio data
 */
function calculateRMS(dataArray) {
  let sumSquares = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const centered = (dataArray[i] - 128) / 128;
    sumSquares += centered * centered;
  }
  return Math.sqrt(sumSquares / dataArray.length);
}

/**
 * Add value to sliding buffer
 */
function addToBuffer(value) {
  audioBuffer[bufferIndex] = value;
  bufferIndex = (bufferIndex + 1) % audioBuffer.length;
  
  if (!bufferFull && bufferIndex === 0) {
    bufferFull = true;
  }
}

/**
 * Process audio data and detect voice activity
 */
function processAudioData(dataArray) {
  const rms = calculateRMS(dataArray);
  addToBuffer(rms);
  
  const now = Date.now();
  
  if (!state.isRecording) {
    // Not recording: look for voice start
    if (rms > config.voiceThreshold) {
      state.isRecording = true;
      state.lastVoiceTime = now;
      state.silenceStartTime = null;
      
      // Notify main thread
      self.postMessage({
        type: 'voiceStart',
        audioLevel: rms,
        timestamp: now
      });
    }
  } else {
    // Recording: look for silence
    if (rms > config.voiceThreshold) {
      // Voice still active
      state.lastVoiceTime = now;
      state.silenceStartTime = null;
    } else if (rms < config.silenceThreshold) {
      // Silence detected
      if (state.silenceStartTime === null) {
        state.silenceStartTime = now;
      } else if (now - state.silenceStartTime >= config.silenceTimeoutMs) {
        // Silence timeout reached
        state.isRecording = false;
        
        // Notify main thread
        self.postMessage({
          type: 'silenceDetected',
          audioLevel: rms,
          timestamp: now
        });
        return;
      }
    } else {
      // Reset silence timer if energy is between thresholds
      state.silenceStartTime = null;
    }
  }
  
  // Send audio level update
  self.postMessage({
    type: 'audioLevel',
    audioLevel: rms,
    isRecording: state.isRecording,
    timestamp: now
  });
}

/**
 * Handle messages from main thread
 */
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'config':
      config = { ...config, ...data };
      break;
      
    case 'audioData':
      processAudioData(data);
      break;
      
    case 'reset':
      state = {
        isRecording: false,
        silenceStartTime: null,
        lastVoiceTime: 0
      };
      bufferIndex = 0;
      bufferFull = false;
      break;
      
    case 'stop':
      state.isRecording = false;
      state.silenceStartTime = null;
      break;
  }
};
