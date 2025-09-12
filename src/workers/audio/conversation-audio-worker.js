// Simplified VAD worker - basic threshold detection

let isRecording = false;
let speechBuffer = [];
let silenceFrames = 0;
let speechStartFrame = 0;

// Simple thresholds
const SPEECH_THRESHOLD = 0.01; // Simple energy threshold
const SILENCE_FRAMES = 15; // ~300ms at 50fps
const MIN_SPEECH_FRAMES = 5; // ~100ms minimum

self.onmessage = (event) => {
  const { type, buffer } = event.data || {};
  
  if (type === 'audio' && buffer) {
    const pcm = new Float32Array(buffer);
    processAudioFrame(pcm);
  }
};

function processAudioFrame(pcm) {
  // Simple RMS calculation
  let energy = 0;
  for (let i = 0; i < pcm.length; i++) {
    energy += pcm[i] * pcm[i];
  }
  const rms = Math.sqrt(energy / pcm.length);
  const level = Math.min(1, rms * 10);
  
  // Emit level for UI
  self.postMessage({ type: 'level', value: level });
  
  // Simple VAD logic
  const isSpeaking = level > SPEECH_THRESHOLD;
  
  if (isSpeaking && !isRecording) {
    // Speech start
    isRecording = true;
    speechBuffer = [];
    silenceFrames = 0;
    speechStartFrame = 0;
    self.postMessage({ type: 'vad', state: 'speech_start' });
  }
  
  if (isRecording) {
    speechBuffer.push(...pcm);
    
    if (isSpeaking) {
      silenceFrames = 0;
    } else {
      silenceFrames++;
    }
    
    // Check for speech end
    if (silenceFrames >= SILENCE_FRAMES && speechBuffer.length > MIN_SPEECH_FRAMES * 320) {
      // Send the complete speech segment
      const segment = new Float32Array(speechBuffer);
      self.postMessage({ 
        type: 'segment', 
        buffer: segment.buffer 
      }, [segment.buffer]);
      
      // Reset
      isRecording = false;
      speechBuffer = [];
      silenceFrames = 0;
    }
  }
}