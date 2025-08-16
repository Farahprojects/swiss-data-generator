/**
 * Robust TTS Audio System - Single persistent audio element + MediaElementSource
 * 
 * This avoids the "createMediaElementSource" and "connect" errors by:
 * - Creating AudioContext and MediaElementSource ONCE
 * - Connecting nodes ONCE  
 * - Only swapping audio.src for each new clip (no node churn)
 * - Using single onended handler to manage all cleanup and events
 */

// Global singleton state
let ctx: AudioContext | null = null;
let audioEl: HTMLAudioElement | null = null;
let srcNode: MediaElementAudioSourceNode | null = null;
let analyser: AnalyserNode | null = null;

// Playback state
let playToken = 0;
let currentAudioLevel = 0;
let isMonitoring = false;
let animationFrame: number | null = null;
let dataArray: Uint8Array | null = null;

// Event handlers
type AudioEventHandler = () => void;
let onPlaybackEnd: AudioEventHandler | null = null;
let onPlaybackError: ((error: Error) => void) | null = null;

/**
 * Initialize the audio system - call once after user gesture
 */
export async function initTtsAudio(): Promise<{ audioEl: HTMLAudioElement; ctx: AudioContext }> {
  // Create audio element once
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = "auto";
    
    // Attach listeners ONCE - no stacking
    audioEl.onended = handleAudioEnded;
    audioEl.onerror = handleAudioError;
    audioEl.onplay = handleAudioPlay;
    audioEl.onpause = handleAudioPause;
    
    console.log('[TtsAudio] Audio element created with single event handlers');
  }

  // Create AudioContext once
  if (!ctx || ctx.state === "closed") {
    ctx = new AudioContext();
    console.log('[TtsAudio] AudioContext created');
  }
  
  // Resume if suspended (autoplay policy)
  if (ctx.state === "suspended") {
    await ctx.resume();
    console.log('[TtsAudio] AudioContext resumed');
  }

  // Create and connect nodes ONCE per audio element
  if (!srcNode) {
    srcNode = ctx.createMediaElementSource(audioEl);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    // Connect once: audio -> analyser -> destination
    srcNode.connect(analyser);
    analyser.connect(ctx.destination);
    
    console.log('[TtsAudio] MediaElementSource and Analyser created and connected ONCE');
  }

  return { audioEl, ctx };
}

/**
 * Play audio from array buffer - the main TTS playback function
 */
export async function playTtsAudio(
  audioBuffer: ArrayBuffer,
  options: {
    onEnd?: () => void;
    onError?: (error: Error) => void;
  } = {}
): Promise<void> {
  const { audioEl } = await initTtsAudio();
  const myToken = ++playToken; // Cancel earlier plays
  
  // Set event handlers for this play
  onPlaybackEnd = options.onEnd || null;
  onPlaybackError = options.onError || null;

  // Stop any current playback
  try { 
    audioEl.pause(); 
    audioEl.currentTime = 0;
  } catch {}

  // Create new blob URL
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  const url = URL.createObjectURL(blob);

  // Revoke old URL after swap
  const oldUrl = audioEl.src;
  audioEl.src = url;
  if (oldUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(oldUrl);
  }

  console.log('[TtsAudio] Audio source swapped, starting playback');

  // Start monitoring
  startAudioLevelMonitoring();

  // Play (handle autoplay policy)
  try {
    await audioEl.play();
  } catch (e) {
    if (ctx && ctx.state === "suspended") {
      await ctx.resume();
      await audioEl.play();
    } else {
      throw e;
    }
  }

  // If a newer play started, quietly stop this one
  if (myToken !== playToken) {
    try { audioEl.pause(); } catch {}
    console.log('[TtsAudio] Play cancelled by newer request');
  }
}

/**
 * Single onended handler - manages all cleanup and events
 */
function handleAudioEnded(): void {
  console.log('[TtsAudio] Audio playback ended');
  
  // Cleanup current blob URL
  if (audioEl?.src?.startsWith("blob:")) {
    URL.revokeObjectURL(audioEl.src);
  }
  
  // Stop monitoring
  stopAudioLevelMonitoring();
  
  // Fire app event
  if (onPlaybackEnd) {
    onPlaybackEnd();
    onPlaybackEnd = null;
  }
}

/**
 * Single error handler
 */
function handleAudioError(event: Event): void {
  console.error('[TtsAudio] Audio playback error:', event);
  
  // Cleanup current blob URL
  if (audioEl?.src?.startsWith("blob:")) {
    URL.revokeObjectURL(audioEl.src);
  }
  
  // Stop monitoring
  stopAudioLevelMonitoring();
  
  // Fire error event
  if (onPlaybackError) {
    const error = audioEl?.error 
      ? new Error(`Audio error: ${audioEl.error.message}`)
      : new Error('Unknown audio error');
    onPlaybackError(error);
    onPlaybackError = null;
  }
}

/**
 * Audio play event
 */
function handleAudioPlay(): void {
  console.log('[TtsAudio] Audio playback started');
  startAudioLevelMonitoring();
}

/**
 * Audio pause event
 */
function handleAudioPause(): void {
  console.log('[TtsAudio] Audio playback paused');
  stopAudioLevelMonitoring();
}

/**
 * Start audio level monitoring
 */
function startAudioLevelMonitoring(): void {
  if (!isMonitoring && analyser && dataArray) {
    isMonitoring = true;
    updateAudioLevel();
    console.log('[TtsAudio] Audio level monitoring started');
  }
}

/**
 * Stop audio level monitoring
 */
function stopAudioLevelMonitoring(): void {
  isMonitoring = false;
  currentAudioLevel = 0;
  
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  
  console.log('[TtsAudio] Audio level monitoring stopped');
}

/**
 * Update audio levels for visual feedback
 */
function updateAudioLevel(): void {
  if (!isMonitoring || !analyser || !dataArray) {
    return;
  }

  // Get frequency data
  analyser.getByteFrequencyData(dataArray);

  // Calculate RMS (root mean square) for audio level
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const value = dataArray[i];
    sum += value * value;
  }
  const rms = Math.sqrt(sum / dataArray.length);
  
  // Normalize to 0-1 range (255 is max value)
  currentAudioLevel = rms / 255;

  // Continue monitoring
  animationFrame = requestAnimationFrame(updateAudioLevel);
}

/**
 * Get current audio level for visual feedback
 */
export function getCurrentAudioLevel(): number {
  return currentAudioLevel;
}

/**
 * Stop current playback
 */
export function stopTtsAudio(): void {
  if (audioEl) {
    try {
      audioEl.pause();
      audioEl.currentTime = 0;
    } catch {}
  }
  stopAudioLevelMonitoring();
  console.log('[TtsAudio] Playback stopped');
}

/**
 * Cleanup everything (for app shutdown)
 */
export function cleanupTtsAudio(): void {
  stopTtsAudio();
  
  if (audioEl?.src?.startsWith("blob:")) {
    URL.revokeObjectURL(audioEl.src);
  }
  
  if (ctx) {
    try {
      ctx.close();
    } catch {}
    ctx = null;
  }
  
  audioEl = null;
  srcNode = null;
  analyser = null;
  dataArray = null;
  
  console.log('[TtsAudio] Complete cleanup finished');
}
