// WebWorker: maintains a rolling buffer and simple VAD; emits speech segments.

// Config
const ROLLING_SECONDS = 12; // keep last 12s
const SAMPLE_RATE = 16000;
const MAX_SAMPLES = ROLLING_SECONDS * SAMPLE_RATE;

// Simple energy-based VAD
const FRAME_MS = 20; // matches worklet frame - sweet spot for mobile/desktop
const FRAME_SAMPLES = (SAMPLE_RATE * FRAME_MS) / 1000; // 320
// Adaptive VAD threshold - starts with sane default, adapts to environment
const BASE_ENERGY_THRESHOLD = 0.005; // 0.005 RMS - more sensitive for speech start
const MIN_THRESHOLD = 0.001; // Minimum threshold for very quiet environments
const MAX_THRESHOLD = 0.05; // Maximum threshold for noisy environments
const ADAPTATION_FACTOR = 0.1; // How quickly to adapt (0.1 = slow adaptation)

const SPEECH_START_FRAMES = 2; // 40ms (2 * 20ms) - more responsive to speech start
const SPEECH_END_FRAMES = 50; // 1000ms (50 * 20ms) - 1 second timeout

let ringBuffer = new Float32Array(MAX_SAMPLES);
let writeIndex = 0;
let filled = false;

let speechActive = false;
let aboveCount = 0;
let belowCount = 0;
let frameCount = 0;

// Adaptive threshold state
let currentThreshold = BASE_ENERGY_THRESHOLD;
let noiseFloorEstimate = BASE_ENERGY_THRESHOLD;
let adaptationFrames = 0;

// Background throttling state
let isThrottled = false;
let throttleCounter = 0;

function appendFrame(frame) {
  const samples = new Float32Array(frame);
  const len = samples.length;
  for (let i = 0; i < len; i++) {
    ringBuffer[writeIndex++] = samples[i];
    if (writeIndex >= MAX_SAMPLES) {
      writeIndex = 0;
      filled = true;
    }
  }
}

function computeEnergy(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    sum += s * s;
  }
  return sum / samples.length;
}

function adaptThreshold(energy, isSpeech) {
  adaptationFrames++;
  
  // Only adapt during non-speech periods to avoid adapting to speech
  if (!isSpeech && adaptationFrames > 10) { // Wait 10 frames before adapting
    // Slowly adapt noise floor estimate
    noiseFloorEstimate = noiseFloorEstimate * (1 - ADAPTATION_FACTOR) + energy * ADAPTATION_FACTOR;
    
    // Set threshold slightly above noise floor
    currentThreshold = Math.max(MIN_THRESHOLD, Math.min(MAX_THRESHOLD, noiseFloorEstimate * 2.5));
  }
  
  return currentThreshold;
}

function extractRollingWindow(seconds) {
  const want = Math.min(seconds * SAMPLE_RATE, filled ? MAX_SAMPLES : writeIndex);
  const out = new Float32Array(want);
  const start = (writeIndex - want + MAX_SAMPLES) % MAX_SAMPLES;
  if (start + want <= MAX_SAMPLES) {
    out.set(ringBuffer.subarray(start, start + want));
  } else {
    const first = MAX_SAMPLES - start;
    out.set(ringBuffer.subarray(start, MAX_SAMPLES), 0);
    out.set(ringBuffer.subarray(0, want - first), first);
  }
  return out;
}

self.onmessage = (event) => {
  const { type } = event.data || {};
  if (type === 'audio') {
    frameCount++;
    if (frameCount === 1) {
    }
    
    // Background throttling: skip processing every other frame when throttled
    if (isThrottled) {
      throttleCounter++;
      if (throttleCounter % 2 === 0) {
        return; // Skip this frame
      }
    }
    
    appendFrame(event.data.buffer);

    // VAD step with adaptive threshold
    const frame = new Float32Array(event.data.buffer);
    const energy = computeEnergy(frame);
    const isSpeech = energy > currentThreshold;
    adaptThreshold(energy, isSpeech); // Update threshold based on current speech state
    

    // Emit audio level for UI (RMS approx, clamp 0..1)
    const level = Math.min(1, Math.sqrt(energy) * 4);
    try { self.postMessage({ type: 'level', value: level }); } catch {}

    if (isSpeech) {
      aboveCount++;
      belowCount = 0;
      if (!speechActive && aboveCount >= SPEECH_START_FRAMES) {
        speechActive = true;
        self.postMessage({ type: 'vad', state: 'speech_start' });
      }
    } else {
      belowCount++;
      if (speechActive && belowCount >= SPEECH_END_FRAMES) {
        speechActive = false;
        aboveCount = 0;
        belowCount = 0;
        // Emit last N seconds as a segment (e.g., 6 seconds)
        const segment = extractRollingWindow(6);
        self.postMessage({ type: 'segment', buffer: segment.buffer }, [segment.buffer]);
      }
    }
  } else if (type === 'reset') {
    writeIndex = 0;
    filled = false;
    speechActive = false;
    aboveCount = 0;
    belowCount = 0;
    frameCount = 0;
    // Reset adaptive threshold
    currentThreshold = BASE_ENERGY_THRESHOLD;
    noiseFloorEstimate = BASE_ENERGY_THRESHOLD;
    adaptationFrames = 0;
    // Reset throttling
    isThrottled = false;
    throttleCounter = 0;
  } else if (type === 'throttle') {
    isThrottled = event.data.enabled;
    throttleCounter = 0;
  }
};


