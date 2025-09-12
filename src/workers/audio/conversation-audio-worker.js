// Simple VAD: start recording on speech, send after 1.2s silence

let isRecording = false;
let speechBuffer = [];
let silenceFrames = 0;

// Simple thresholds
const SPEECH_THRESHOLD = 0.02; // Higher threshold to avoid background noise
const SILENCE_FRAMES = 60; // 1.2 seconds at 50fps (60 * 20ms = 1200ms)

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
    // Speech start - start collecting
    isRecording = true;
    speechBuffer = [];
    silenceFrames = 0;
    self.postMessage({ type: 'vad', state: 'speech_start' });
  }
  
  if (isRecording) {
    // Always collect audio while recording
    speechBuffer.push(...pcm);
    
    if (isSpeaking) {
      silenceFrames = 0; // Reset silence counter
    } else {
      silenceFrames++;
    }
    
    // Send after 1.2 seconds of silence
    if (silenceFrames >= SILENCE_FRAMES) {
      // Send the complete audio segment
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