// WebWorker: maintains a rolling buffer and simple VAD; emits speech segments.

// Config
const ROLLING_SECONDS = 12; // keep last 12s
const SAMPLE_RATE = 16000;
const MAX_SAMPLES = ROLLING_SECONDS * SAMPLE_RATE;

// 🚀 MOBILE OPTIMIZATION: Adaptive frame size and dynamic VAD
const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const FRAME_MS = isMobile ? 20 : 10; // 20ms on mobile, 10ms on desktop
const FRAME_SAMPLES = (SAMPLE_RATE * FRAME_MS) / 1000; // 320 on mobile, 160 on desktop

// Dynamic VAD threshold - adapts to ambient noise
const BASE_ENERGY_THRESHOLD = 0.0001;
const NOISE_ADAPTATION_FACTOR = 2.0; // Threshold scales with noise level
const NOISE_SAMPLES = 50; // Number of frames to average for noise baseline

const SPEECH_START_FRAMES = 5; // 50ms
const SPEECH_END_FRAMES = 120; // 1200ms (1.2s)

let ringBuffer = new Float32Array(MAX_SAMPLES);
let writeIndex = 0;
let filled = false;

let speechActive = false;
let aboveCount = 0;
let belowCount = 0;
let frameCount = 0;

// 🚀 MOBILE OPTIMIZATION: Dynamic VAD and background processing
let noiseBaseline = 0;
let noiseSamples = [];
let isBackground = false;
let backgroundFrameSkip = 0;
const BACKGROUND_SKIP_FRAMES = 10; // Process every 10th frame in background

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

// 🚀 MOBILE OPTIMIZATION: Update noise baseline for dynamic threshold
function updateNoiseBaseline(energy) {
  noiseSamples.push(energy);
  if (noiseSamples.length > NOISE_SAMPLES) {
    noiseSamples.shift();
  }
  
  // Calculate average noise level
  let sum = 0;
  for (let i = 0; i < noiseSamples.length; i++) {
    sum += noiseSamples[i];
  }
  noiseBaseline = sum / noiseSamples.length;
}

// 🚀 MOBILE OPTIMIZATION: Get adaptive threshold based on noise level
function getAdaptiveThreshold() {
  const adaptiveThreshold = BASE_ENERGY_THRESHOLD + (noiseBaseline * NOISE_ADAPTATION_FACTOR);
  return Math.max(BASE_ENERGY_THRESHOLD, adaptiveThreshold);
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
      console.log('[AudioWorker] ✅ First frame received - worker is active');
    }
    
    // 🚀 MOBILE OPTIMIZATION: Background processing reduction
    if (isBackground) {
      backgroundFrameSkip++;
      if (backgroundFrameSkip < BACKGROUND_SKIP_FRAMES) {
        return; // Skip processing in background
      }
      backgroundFrameSkip = 0;
    }
    
    appendFrame(event.data.buffer);

    // VAD step with dynamic threshold
    const frame = new Float32Array(event.data.buffer);
    const energy = computeEnergy(frame);
    
    // 🚀 MOBILE OPTIMIZATION: Update noise baseline and get adaptive threshold
    updateNoiseBaseline(energy);
    const adaptiveThreshold = getAdaptiveThreshold();
    const isSpeech = energy > adaptiveThreshold;
    

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
    // 🚀 MOBILE OPTIMIZATION: Reset noise baseline on reset
    noiseBaseline = 0;
    noiseSamples = [];
    backgroundFrameSkip = 0;
  } else if (type === 'background') {
    // 🚀 MOBILE OPTIMIZATION: Handle background state changes
    isBackground = event.data.isBackground || false;
    if (isBackground) {
      console.log('[AudioWorker] 📱 Entering background mode - reducing processing');
    } else {
      console.log('[AudioWorker] 📱 Returning to foreground - full processing');
      backgroundFrameSkip = 0;
    }
  }
};


