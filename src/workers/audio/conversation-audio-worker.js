// WebWorker: maintains a rolling buffer and simple VAD; emits speech segments.

// UA detection for Android Chrome tuning
const IS_ANDROID_CHROME = (typeof self !== 'undefined' && typeof navigator !== 'undefined')
  ? (/Android/i.test(navigator.userAgent) && /Chrome\/\d+/i.test(navigator.userAgent) && /Mobile/i.test(navigator.userAgent))
  : false;

// Config
const ROLLING_SECONDS = 12; // keep last 12s
const SAMPLE_RATE = 16000;
const MAX_SAMPLES = ROLLING_SECONDS * SAMPLE_RATE;

// Simple energy-based VAD
const FRAME_MS = 20; // matches worklet frame - sweet spot for mobile/desktop
const FRAME_SAMPLES = (SAMPLE_RATE * FRAME_MS) / 1000; // 320
// Adaptive VAD threshold - starts with sane default, adapts to environment
const BASE_ENERGY_THRESHOLD = IS_ANDROID_CHROME ? 0.0015 : 0.002; // more sensitive on Android
const MIN_THRESHOLD = 0.0004; // Minimum threshold for very quiet environments
const MAX_THRESHOLD = 0.05; // Maximum threshold for noisy environments
const ADAPTATION_FACTOR = 0.1; // How quickly to adapt (0.1 = slow adaptation)

const SPEECH_START_FRAMES = 2; // 40ms (2 * 20ms)
const SPEECH_END_FRAMES = IS_ANDROID_CHROME ? 10 : 12; // 200ms (Android) / 240ms (others)
const PRE_ROLL_FRAMES = SPEECH_START_FRAMES; // include frames that triggered start

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

// Utterance collection (precise start->end)
let preRoll = [];
let utteranceFrames = [];
let utteranceSamples = 0;

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
  if (!isSpeech && adaptationFrames > 10) {
    noiseFloorEstimate = noiseFloorEstimate * (1 - ADAPTATION_FACTOR) + energy * ADAPTATION_FACTOR;
    currentThreshold = Math.max(MIN_THRESHOLD, Math.min(MAX_THRESHOLD, noiseFloorEstimate * 1.5));
  }
  return currentThreshold;
}

function concatFrames(frames) {
  let total = 0;
  for (let i = 0; i < frames.length; i++) total += frames[i].length;
  const out = new Float32Array(total);
  let offset = 0;
  for (let i = 0; i < frames.length; i++) {
    out.set(frames[i], offset);
    offset += frames[i].length;
  }
  return out;
}

self.onmessage = (event) => {
  const { type } = event.data || {};
  if (type === 'audio') {
    frameCount++;

    // Background throttling: skip processing every other frame when throttled
    if (isThrottled) {
      throttleCounter++;
      if (throttleCounter % 2 === 0) {
        return; // Skip this frame
      }
    }

    appendFrame(event.data.buffer);

    const frame = new Float32Array(event.data.buffer);
    const energy = computeEnergy(frame);
    const isSpeech = energy > currentThreshold;
    adaptThreshold(energy, isSpeech);

    // Level for UI (RMS approx, clamp 0..1)
    const level = Math.min(1, Math.sqrt(energy) * 2);
    try { self.postMessage({ type: 'level', value: level }); } catch {}

    // Maintain small pre-roll of the most recent frames
    preRoll.push(frame);
    if (preRoll.length > PRE_ROLL_FRAMES) preRoll.shift();

    if (isSpeech) {
      aboveCount++;
      belowCount = 0;
      if (!speechActive && aboveCount >= SPEECH_START_FRAMES) {
        // Start of utterance: seed with pre-roll
        speechActive = true;
        utteranceFrames = preRoll.slice();
        utteranceSamples = utteranceFrames.reduce((n, f) => n + f.length, 0);
        try { self.postMessage({ type: 'vad', state: 'speech_start' }); } catch {}
      }
      // If active, collect current frame
      if (speechActive) {
        utteranceFrames.push(frame);
        utteranceSamples += frame.length;
      }
    } else {
      belowCount++;
      if (speechActive && belowCount >= SPEECH_END_FRAMES) {
        // End of utterance: emit precise start->end audio
        speechActive = false;
        aboveCount = 0;
        belowCount = 0;
        const segment = concatFrames(utteranceFrames);
        utteranceFrames = [];
        utteranceSamples = 0;
        try { self.postMessage({ type: 'segment', buffer: segment.buffer }, [segment.buffer]); } catch {}
      }
    }
  } else if (type === 'reset') {
    writeIndex = 0;
    filled = false;
    speechActive = false;
    aboveCount = 0;
    belowCount = 0;
    frameCount = 0;
    currentThreshold = BASE_ENERGY_THRESHOLD;
    noiseFloorEstimate = BASE_ENERGY_THRESHOLD;
    adaptationFrames = 0;
    isThrottled = false;
    throttleCounter = 0;
    preRoll = [];
    utteranceFrames = [];
    utteranceSamples = 0;
  } else if (type === 'throttle') {
    isThrottled = event.data.enabled;
    throttleCounter = 0;
  }
};


