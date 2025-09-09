// WebWorker: maintains a rolling buffer and simple VAD; emits speech segments.

// Config
const ROLLING_SECONDS = 12; // keep last 12s
const SAMPLE_RATE = 16000;
const MAX_SAMPLES = ROLLING_SECONDS * SAMPLE_RATE;

// Simple energy-based VAD
const FRAME_MS = 10; // matches worklet frame
const FRAME_SAMPLES = (SAMPLE_RATE * FRAME_MS) / 1000; // 160
const ENERGY_THRESHOLD = 0.0001; // much lower threshold for quiet environments
const SPEECH_START_FRAMES = 5; // 50ms
const SPEECH_END_FRAMES = 120; // 1200ms (1.2s)

let ringBuffer = new Float32Array(MAX_SAMPLES);
let writeIndex = 0;
let filled = false;

let speechActive = false;
let aboveCount = 0;
let belowCount = 0;
let frameCount = 0;

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
    
    appendFrame(event.data.buffer);

    // VAD step
    const frame = new Float32Array(event.data.buffer);
    const energy = computeEnergy(frame);
    const isSpeech = energy > ENERGY_THRESHOLD;
    
    // Debug: Log energy values occasionally
    if (frameCount % 100 === 0) {
      console.log(`[AudioWorker] Energy: ${energy.toFixed(6)}, Threshold: ${ENERGY_THRESHOLD}, isSpeech: ${isSpeech}`);
    }

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
  }
};


