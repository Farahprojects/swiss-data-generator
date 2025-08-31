// src/services/voice/conversationTts.ts
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';

export interface SpeakAssistantOptions {
chat_id: string;
messageId: string;
text: string;
onStart?: () => void;
onComplete?: () => void;
}

type TtsState = 'idle' | 'preparing' | 'playing' | 'stopping' | 'disposed';

class AudioLockedError extends Error {
constructor(message = 'Audio is locked; user gesture required') {
super(message);
this.name = 'AudioLockedError';
}
}

class TtsFetchError extends Error {
status?: number;
constructor(message: string, status?: number) {
super(message);
this.name = 'TtsFetchError';
this.status = status;
}
}

class PlaybackError extends Error {
constructor(message: string) {
super(message);
this.name = 'PlaybackError';
}
}

const DEBUG = typeof window !== 'undefined' && (window as any).TTS_DEBUG === true;
const TTS_TIMEOUT_MS = 25_000;

const VOICE_MAP: Record<string, string> = {
// extend as needed; default is Puck
Puck: 'en-US-Chirp3-HD-Puck',
};

function logDebug(...args: any[]) {
if (DEBUG) console.log('[ConversationTTS]', ...args);
}

function mapVoiceName(name?: string): string {
const key = (name || '').trim();
if (key && VOICE_MAP[key]) return VOICE_MAP[key];
return VOICE_MAP.Puck;
}

export class ConversationTtsService {
private state: TtsState = 'idle';

private audioContext?: AudioContext;
private analyser?: AnalyserNode;
private dataArray?: Uint8Array;
private rafId?: number;

private masterAudioElement?: HTMLAudioElement;
private mediaElementSource?: MediaElementAudioSourceNode;

private isAudioUnlocked = false;

private audioLevel = 0;
private listeners = new Set<() => void>();

private currentObjectUrl?: string;
private currentAbort?: AbortController;

// Used to ensure we only complete the most recent playback
private playbackToken = 0;

// Call on user gesture to allow playback on iOS/Safari
public unlockAudio(): void {
if (typeof window === 'undefined' || typeof document === 'undefined') return;

try {
  // AudioContext
  if (!this.audioContext) {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) {
      console.warn('[ConversationTTS] AudioContext not supported in this browser.');
      return;
    }
    this.audioContext = new Ctx();
  }
  // Resume if needed
  if (this.audioContext.state === 'suspended') {
    // Resume synchronously if possible
    void this.audioContext.resume();
  }

  // Audio element
  if (!this.masterAudioElement) {
    const el = document.createElement('audio');
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    el.setAttribute('playsinline', 'true');
    el.style.display = 'none';
    document.body.appendChild(el);
    this.masterAudioElement = el;
  } else {
    // clear previous errors and ensure state ok
    this.masterAudioElement.muted = false;
    this.masterAudioElement.crossOrigin = 'anonymous';
  }

  this.isAudioUnlocked = true;
  logDebug('Audio unlocked and ready');
  
  // Prime the decoder with a silent MP3 to warm the media pipeline
  this.primeDecoder();
} catch (err) {
  console.error('[ConversationTTS] Error unlocking audio:', err);
}
}

public getCurrentAudioLevel(): number {
return this.audioLevel;
}

public getMasterAudioElement(): HTMLAudioElement | null {
return this.masterAudioElement ?? null;
}

public subscribe(listener: () => void): () => void {
this.listeners.add(listener);
return () => this.listeners.delete(listener);
}

private notifyListeners(): void {
this.listeners.forEach(fn => fn());
}

// Primary TTS entrypoint - now relies on WebSocket subscription for playback
public async speakAssistant(opts: SpeakAssistantOptions): Promise<void> {
try {
const { chat_id, text, onStart, onComplete } = opts;

  performance.mark('tts_request_start');
  console.log('[ConversationTtsService] Starting TTS generation via edge function');

  const sanitized = this.sanitizeTtsText(text);
  const selectedVoiceName = useChatStore.getState().ttsVoice || 'Puck';

  const response = await this.fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/google-text-to-speech`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        chat_id,
        text: sanitized,
        voice: selectedVoiceName, // Send the voice name directly
      }),
    },
    TTS_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new TtsFetchError(`TTS failed: ${response.status} - ${errorText}`, response.status);
  }

  const data = await response.json();
  performance.mark('tts_edge_response');
  console.log('[ConversationTtsService] TTS generation completed:', data);
  
  // IMMEDIATE PLAYBACK: Start playing the returned audio URL right away
  // The WebSocket subscription will still handle state sync as backup
  if (data.success && data.audioUrl) {
    console.log('[ConversationTtsService] Starting immediate playback:', data.audioUrl);
    onStart?.();
    
    try {
      // Direct playback - no deduplication needed since WebSocket fallback is removed
      await this.playFromUrl(data.audioUrl, () => {
        console.log('[ConversationTtsService] Immediate playback completed');
        
        // Log performance measurements
        try {
          const ttsRequestToResponse = performance.measure('tts_request_to_response', 'tts_request_start', 'tts_edge_response');
          const responseToPlaying = performance.measure('response_to_playing', 'tts_edge_response', 'audio_playing');
          const totalLatency = performance.measure('total_tts_latency', 'tts_request_start', 'audio_playing');
          
          console.log('[ConversationTtsService] Performance:', {
            ttsRequestToResponse: `${ttsRequestToResponse.duration.toFixed(1)}ms`,
            responseToPlaying: `${responseToPlaying.duration.toFixed(1)}ms`,
            totalLatency: `${totalLatency.duration.toFixed(1)}ms`
          });
        } catch (e) {
          // Performance marks might not be available
        }
        
        onComplete?.();
      });
    } catch (playErr) {
      console.warn('[ConversationTtsService] Immediate playback failed, relying on WebSocket:', playErr);
      onComplete?.(); // Still call onComplete to not block flow
    }
  } else {
    // Fallback: still call callbacks but rely on WebSocket
    onStart?.();
    onComplete?.();
  }

} catch (err) {
  console.error('[ConversationTtsService] TTS generation failed:', err);
  throw err;
}
}

// URL playback entrypoint
public async playFromUrl(audioUrl: string, onComplete?: () => void, onStart?: () => void): Promise<void> {
  performance.mark('tts_playback_start');
  
  const token = this.beginPlayback();
  try {
    if (!this.isAudioUnlocked || !this.masterAudioElement) {
      throw new AudioLockedError();
    }
    
    await this.ensureAudioContext();

    this.replaceObjectUrl(audioUrl); // caller provided; we will not revoke external URLs
    // Remove duplicate prepareAudioGraph call - will be done lazily in playInternal
    await this.playInternal(token, this.masterAudioElement, audioUrl, onStart, onComplete);
  } catch (err) {
    console.error('[ConversationTtsService] ❌ playFromUrl failed:', err);
    this.failPlayback(err);
    if (onComplete) onComplete();
    throw err;
  }
}

// For conversation mode; ensure audio line is ready
public handleDirectTtsResponse(_chat_id: string): void {
if (!this.isAudioUnlocked) return;
// ensure audio context is resumed ASAP
void this.audioContext?.resume().catch(() => {});
}

// Suspend audio line (e.g., when mic engages)
public suspendAudioPlayback(): void {
if (this.audioContext?.state === 'running') {
void this.audioContext.suspend().catch(() => {});
}
}

// Resume audio line (e.g., when mic releases)
public resumeAudioPlayback(): void {
if (this.audioContext?.state === 'suspended') {
void this.audioContext.resume().catch(() => {});
}
}

// Hard stop current playback and cleanup
public stopAllAudio(): void {
if (this.state === 'disposed') return;
this.state = 'stopping';

this.cancelRaf();
this.detachMediaGraph();

if (this.masterAudioElement) {
  try {
    this.masterAudioElement.pause();
    // Do not clear src immediately; revoke/release via replaceObjectUrl/cleanup
  } catch {}
}

this.replaceAbort(undefined);
this.replaceObjectUrl(undefined);

this.audioLevel = 0;
this.notifyListeners();

this.state = 'idle';
}

// Full teardown
public resetAllAndDispose(): void {
this.stopAllAudio();
this.state = 'disposed';

this.replaceAbort(undefined);

if (this.mediaElementSource) {
  try {
    this.mediaElementSource.disconnect();
  } catch {}
  this.mediaElementSource = undefined;
}

if (this.audioContext) {
  const ctx = this.audioContext;
  this.audioContext = undefined;
  void ctx.close().catch(() => {});
}

if (this.masterAudioElement) {
  try {
    this.masterAudioElement.pause();
  } catch {}
  if (this.masterAudioElement.parentElement) {
    this.masterAudioElement.parentElement.removeChild(this.masterAudioElement);
  }
  this.masterAudioElement = undefined;
}

this.analyser = undefined;
this.dataArray = undefined;
this.isAudioUnlocked = false;
this.playbackToken++;
}

public resetAllFlags(): void {
// Keep simple: reset peak level and completion guards implicitly by state
this.audioLevel = 0;
this.notifyListeners();
}

// Internals

private beginPlayback(): number {
if (this.state === 'disposed') throw new PlaybackError('Service disposed');
// Cancel any in-flight playback/fetch
this.stopAllAudio();
this.state = 'preparing';
const token = ++this.playbackToken;
return token;
}

private failPlayback(err: unknown) {
logDebug('Playback failed:', err);
this.stopAllAudio();
}

private async playInternal(
token: number,
el: HTMLAudioElement,
src: string,
onStart?: () => void,
onComplete?: () => void
): Promise<void> {
if (this.state === 'disposed') throw new PlaybackError('Service disposed');

const complete = (reason: 'ended' | 'error' | 'canceled') => {
  // Only complete the most recent playback
  if (token !== this.playbackToken) return;
  this.state = 'stopping';
  this.cancelRaf();
  this.audioLevel = 0;
  this.notifyListeners();
  this.detachMediaGraph();

  // Do not revoke external URLs unless we created it
  // replaceObjectUrl(undefined) will handle revocation of our last objectURL
  if (reason !== 'canceled') this.replaceObjectUrl(undefined);

  el.removeEventListener('ended', handleEnded);
  el.removeEventListener('error', handleError);
  el.removeEventListener('playing', handlePlaying);

  this.state = 'idle';
  if (reason !== 'error' && onComplete) onComplete();
};

const handleEnded = () => complete('ended');
const handleError = () => complete('error');
const handlePlaying = () => {
  // Only for the most recent playback
  if (token !== this.playbackToken) return;

  performance.mark('audio_playing');
  
  // Lazy connect the analyser graph only after playback starts
  this.prepareAudioGraph(el).then(() => {
    if (token !== this.playbackToken) return;
    
    // If analyser graph is connected, run real analysis
    if (this.analyser && this.dataArray) {
      this.startAmplitudeAnalysis();
    } else {
      // Fallback: synthetic envelope in case of CORS/graph issues
      this.cancelRaf();
      let t = 0;
      const loop = () => {
        if (token !== this.playbackToken) return;
        // simple pulsing 0.2..0.8
        this.audioLevel = 0.5 + 0.3 * Math.sin(t);
        t += 0.18;
        this.notifyListeners();
        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    }
  }).catch(() => {
    // If analyser setup fails, fall back to synthetic
    if (token !== this.playbackToken) return;
    this.cancelRaf();
    let t = 0;
    const loop = () => {
      if (token !== this.playbackToken) return;
      this.audioLevel = 0.5 + 0.3 * Math.sin(t);
      t += 0.18;
      this.notifyListeners();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  });
  
  el.removeEventListener('playing', handlePlaying);
};

el.addEventListener('ended', handleEnded, { once: true });
el.addEventListener('error', handleError, { once: true });
el.addEventListener('playing', handlePlaying);
el.addEventListener('loadedmetadata', () => performance.mark('audio_loadedmetadata'));
el.addEventListener('canplay', () => performance.mark('audio_canplay'));

// Set src immediately for fastest playback start
el.src = src;

try {
  this.state = 'playing';
  await this.audioContext?.resume().catch(() => {});
  await el.play();
  if (token === this.playbackToken) onStart?.();
  logDebug('Playback started');
} catch (e) {
  console.error('[ConversationTtsService] ❌ Audio play() failed:', e);
  el.removeEventListener('playing', handlePlaying);
  complete('error');
  throw new PlaybackError(`Audio play failed: ${(e as any)?.message || e}`);
}
}

private async ensureAudioContext(): Promise<void> {
if (!this.audioContext) {
const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
if (!Ctx) throw new PlaybackError('AudioContext not supported');
this.audioContext = new Ctx();
}
if (this.audioContext.state === 'suspended') {
await this.audioContext.resume().catch(() => {});
}
}

private async prepareAudioGraph(el: HTMLAudioElement): Promise<void> {
await this.ensureAudioContext();
const ctx = this.audioContext!;
// Create analyser once
if (!this.analyser) {
const analyser = ctx.createAnalyser();
analyser.fftSize = 2048;
analyser.smoothingTimeConstant = 0.85;
this.analyser = analyser;
this.dataArray = new Uint8Array(analyser.frequencyBinCount) as Uint8Array;
}

// Create the media element source once for this element
if (!this.mediaElementSource) {
  this.mediaElementSource = ctx.createMediaElementSource(el);
}

// Reconnect graph fresh
try {
  this.mediaElementSource.disconnect();
} catch {}
this.mediaElementSource.connect(this.analyser!);
this.mediaElementSource.connect(ctx.destination);
}

private startAmplitudeAnalysis(): void {
if (!this.analyser || !this.dataArray) return;

const loop = () => {
  if (!this.analyser || !this.dataArray) return;

  const tempDataArray = new Uint8Array(this.analyser.frequencyBinCount);
  this.analyser.getByteTimeDomainData(tempDataArray);
  let sum = 0;
  for (let i = 0; i < tempDataArray.length; i++) {
    const v = (tempDataArray[i] - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / tempDataArray.length);

  // Map RMS to [0..1]
  const level = Math.max(0, Math.min(1, (rms - 0.02) / 0.3));
  // Smooth
  this.audioLevel = this.audioLevel * 0.8 + level * 0.2;
  this.notifyListeners();

  this.rafId = requestAnimationFrame(loop);
};

this.cancelRaf();
this.rafId = requestAnimationFrame(loop);
}

private cancelRaf(): void {
if (this.rafId) {
cancelAnimationFrame(this.rafId);
this.rafId = undefined;
}
}

private detachMediaGraph(): void {
if (this.mediaElementSource) {
try {
this.mediaElementSource.disconnect();
} catch {}
}
}

private replaceObjectUrl(next?: string): void {
// Revoke previous if we created it
if (this.currentObjectUrl && this.currentObjectUrl.startsWith('blob:')) {
try {
URL.revokeObjectURL(this.currentObjectUrl);
} catch {}
}
this.currentObjectUrl = next;
}

private replaceAbort(next?: AbortController): void {
if (this.currentAbort) {
try {
this.currentAbort.abort();
} catch {}
}
this.currentAbort = next;
}

private async fetchWithTimeout(
url: string,
init: RequestInit,
timeoutMs: number
): Promise<Response> {
const controller = init.signal instanceof AbortSignal ? undefined : new AbortController();
const signal = controller?.signal ?? init.signal;

let timeoutId: number | undefined;
if (controller) {
  timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
}

try {
  return await fetch(url, { ...init, signal });
} finally {
  if (timeoutId !== undefined) {
    clearTimeout(timeoutId);
  }
}
}

// Conservative sanitization: remove code blocks/inline code and markdown markers, keep punctuation
private sanitizeTtsText(input: string): string {
if (!input) return '';
let t = input;
// Remove fenced code blocks
t = t.replace(/```[\s\S]*?```/g, ' ');
// Remove inline code ticks
t = t.replace(/`+/g, '');
// Remove markdown headers/emphasis/quotes
t = t.replace(/[#*_>]+/g, ' ');
// Collapse whitespace
t = t.replace(/\s+/g, ' ').trim();
return t;
}

// Prime the decoder with a silent MP3 to warm the media pipeline
private async primeDecoder(): Promise<void> {
  if (!this.masterAudioElement) return;
  
  try {
    // Create a minimal silent MP3 data URL (50-100ms of silence)
    const silentMp3DataUrl = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjIwLjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAAFbgBtbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1tbW1t//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjM1AAAAAAAAAAAAAAAAJAYAAAAAAAAABW4A';
    
    const el = this.masterAudioElement;
    const originalSrc = el.src;
    
    // Set the silent MP3 and play briefly
    el.src = silentMp3DataUrl;
    await el.play();
    
    // Pause after a short delay to warm the decoder
    setTimeout(() => {
      if (el.src === silentMp3DataUrl) {
        el.pause();
        el.src = originalSrc || '';
      }
    }, 50);
    
    logDebug('Decoder primed with silent MP3');
  } catch (err) {
    // Silent fail - priming is optional
    logDebug('Decoder priming failed (non-critical):', err);
  }
}
}

export const conversationTtsService = new ConversationTtsService();