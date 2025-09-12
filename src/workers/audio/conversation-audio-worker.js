// WebWorker: maintains a rolling buffer and simple VAD; emits speech segments.

// Config
const ROLLING_SECONDS = 12; // keep last 12s
const SAMPLE_RATE = 16000;
const MAX_SAMPLES = ROLLING_SECONDS * SAMPLE_RATE;

// Simple energy-based VAD
const FRAME_MS = 20; // matches worklet frame - sweet spot for mobile/desktop
const FRAME_SAMPLES = (SAMPLE_RATE * FRAME_MS) / 1000; // 320
// Adaptive VAD threshold - starts with sane default, adapts to environment
const BASE_ENERGY_THRESHOLD = 0.002; // 0.002 RMS - more sensitive for speech start
const MIN_THRESHOLD = 0.0005; // Minimum threshold for very quiet environments
const MAX_THRESHOLD = 0.05; // Maximum threshold for noisy environments
const ADAPTATION_FACTOR = 0.1; // How quickly to adapt (0.1 = slow adaptation)

const SPEECH_START_FRAMES = 2; // 40ms (2 * 20ms) - more responsive to speech start
const SPEECH_END_FRAMES = 25; // 500ms (25 * 20ms) - faster processing

let ringBuffer = new Float32Array(MAX_SAMPLES);
let writeIndex = 0;
let filled = false;

let speechActive = false;
let aboveCount = 0;
let belowCount = 0;
let frameCount = 0;

let reportedFirstFrame = false;

// Start barrier: hold frames for a short pre-roll window, then open
let barrierOpen = false;
let barrierOpenAtMs = 0;

// Adaptive threshold state
let currentThreshold = BASE_ENERGY_THRESHOLD;
let noiseFloorEstimate = BASE_ENERGY_THRESHOLD;
let adaptationFrames = 0;

// Calibration/locking state
const CALIBRATION_FRAMES = 150; // ~3000ms at 20ms/frame - longer for better baseline
let isCalibrating = false;
let calibrationFrames = 0;
let calibrationEnergySum = 0;
let calibrated = false;
const THRESH_MULTIPLIER = 4.0; // noise -> threshold multiplier - more conservative

// Drift detection
let driftAvgEnergy = 0;
const DRIFT_ALPHA = 0.02; // EWMA for drift monitoring
const DRIFT_FACTOR = 2.0; // trigger recalibration if noise floor ~2x
let driftCounter = 0;
const DRIFT_FRAMES = 50; // sustained frames to confirm drift

// AEC warmup suppression: block segment emission for N frames
let suppressUntilFrame = 0;

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
    
    // Set threshold slightly above noise floor (more sensitive)
    currentThreshold = Math.max(MIN_THRESHOLD, Math.min(MAX_THRESHOLD, noiseFloorEstimate * 1.5));
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
    
    // Drop stale frames if input backlog occurs, but allow pre-roll
    // Accept frames not older than 500ms relative to our internal frameCount clock
    const incomingTs = event.data.ts || 0; // ~ms
    const approxNowMs = frameCount * FRAME_MS;
    const isWithinPreroll = !barrierOpen || (incomingTs >= barrierOpenAtMs - 300);
    if (incomingTs && approxNowMs - incomingTs > 500 && !isWithinPreroll) {
      // Too old; drop to avoid late-processing old audio
      return;
    }

    appendFrame(event.data.buffer);
    if (!reportedFirstFrame) {
      reportedFirstFrame = true;
      try { self.postMessage({ type: 'first_frame_written' }); } catch {}
    }

    // VAD step with adaptive threshold / locked threshold
    const frame = new Float32Array(event.data.buffer);
    const energy = computeEnergy(frame);
    const isSpeech = energy > currentThreshold;
    if (!calibrated) {
      // During uncalibrated phase, adapt only on non-speech
      adaptThreshold(energy, isSpeech);
    }

    // Calibration window (non-speech frames only)
    if (isCalibrating && !isSpeech) {
      calibrationEnergySum += energy;
      calibrationFrames++;
      if (calibrationFrames >= CALIBRATION_FRAMES) {
        const avgEnergy = calibrationEnergySum / Math.max(1, calibrationFrames);
        const noiseRms = Math.sqrt(Math.max(avgEnergy, 1e-9));
        // Lock threshold based on calibrated noise
        currentThreshold = Math.max(MIN_THRESHOLD, Math.min(MAX_THRESHOLD, noiseRms * THRESH_MULTIPLIER));
        calibrated = true;
        isCalibrating = false;
        calibrationFrames = 0;
        calibrationEnergySum = 0;
        // Seed drift monitor
        driftAvgEnergy = avgEnergy;
        try { self.postMessage({ type: 'calibration_done', baseline: { noiseRms } }); } catch {}
      }
    }

    // Drift monitoring when not in speech and calibrated
    if (calibrated && !isCalibrating && !isSpeech) {
      driftAvgEnergy = (1 - DRIFT_ALPHA) * driftAvgEnergy + DRIFT_ALPHA * energy;
      // Compare RMS (sqrt of energy) ratios to detect environmental drift
      const driftRms = Math.sqrt(Math.max(driftAvgEnergy, 1e-9));
      const lockedRms = Math.max(currentThreshold / THRESH_MULTIPLIER, 1e-9);
      const ratio = driftRms / lockedRms;
      if (ratio > DRIFT_FACTOR || ratio < 1 / DRIFT_FACTOR) {
        driftCounter++;
        if (driftCounter >= DRIFT_FRAMES) {
          // Trigger recalibration sequence
          isCalibrating = true;
          calibrated = false;
          calibrationFrames = 0;
          calibrationEnergySum = 0;
          driftCounter = 0;
          try { self.postMessage({ type: 'recalibrate_needed' }); } catch {}
        }
      } else if (driftCounter > 0) {
        driftCounter = 0;
      }
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
        if (frameCount >= suppressUntilFrame) {
          const segment = extractRollingWindow(6);
          self.postMessage({ type: 'segment', buffer: segment.buffer }, [segment.buffer]);
        }
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
    // Reset barrier
    barrierOpen = false;
    barrierOpenAtMs = 0;
    reportedFirstFrame = false;
    // Reset calibration/drift
    isCalibrating = false;
    calibrated = false;
    calibrationFrames = 0;
    calibrationEnergySum = 0;
    driftAvgEnergy = 0;
    driftCounter = 0;
    suppressUntilFrame = 0;
  } else if (type === 'throttle') {
    isThrottled = event.data.enabled;
    throttleCounter = 0;
  } else if (type === 'barrier_open') {
    barrierOpen = true;
    barrierOpenAtMs = frameCount * FRAME_MS;
    // Start calibration on barrier open
    isCalibrating = true;
    calibrated = false;
    calibrationFrames = 0;
    calibrationEnergySum = 0;
  } else if (type === 'recalibrate') {
    // External request to recalibrate
    isCalibrating = true;
    calibrated = false;
    calibrationFrames = 0;
    calibrationEnergySum = 0;
  } else if (type === 'aec_warmup') {
    const ms = Math.max(0, Number(event.data?.ms || 0));
    const addFrames = Math.ceil(ms / FRAME_MS);
    suppressUntilFrame = Math.max(suppressUntilFrame, frameCount + addFrames);
  }
};


