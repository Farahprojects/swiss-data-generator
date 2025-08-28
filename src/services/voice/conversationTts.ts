// src/services/voice/conversationTts.ts
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';

export interface SpeakAssistantOptions {
  chat_id: string;
  messageId: string;
  text: string;
  sessionId: string | null;
  onStart?: () => void; // Optional callback when audio starts playing
  onComplete?: () => void; // Optional callback when audio finishes
}

class ConversationTtsService {
  private audioLevel = 0;
  private listeners = new Set<() => void>();
  private isTtsCompleting = false; // NEW: Guard against multiple TTS completions

  // ✅ REAL AUDIO ANALYSIS: Fields for amplitude-driven animation
  private audioContext?: AudioContext;
  private analyser?: AnalyserNode;
  private dataArray?: Uint8Array;
  private rafId?: number;
  private currentNodes?: { source: MediaElementAudioSourceNode; gain: GainNode | null };
  private isAudioUnlocked = false;
  private masterAudioElement: HTMLAudioElement | null = null;
  private cachedMediaElementSource?: MediaElementAudioSourceNode; // Cache for reuse

  /**
   * Unlocks audio playback after a user gesture. This is the single entry point
   * for preparing all audio systems (AudioContext and the master audio element).
   * It's crucial for iOS compatibility and MUST be called synchronously from a
   * user interaction event handler (e.g., onClick).
   * SAFARI FIX: Always re-validate and re-prime audio on every user gesture call.
   */
  public async unlockAudio(): Promise<void> {
    console.log('[TTS-LOG] Audio unlock called, audioContext.state:', this.audioContext?.state || 'none');

    try {
      // 1. Initialize and resume AudioContext
      if (!this.audioContext) {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
        } else {
          console.warn('[TTS-LOG] AudioContext not supported.');
          return;
        }
      }

      // Resume audio context if suspended - ALWAYS check, don't skip
      if (this.audioContext.state === 'suspended') {
        console.log('[TTS-LOG] Resuming suspended AudioContext');
        await this.audioContext.resume();
      }
      console.log('[TTS-LOG] AudioContext state after resume:', this.audioContext.state);

      // 2. Create and prime the master audio element with silent audio (Safari fix)
      // SAFARI FIX: Always ensure element exists and re-prime on every gesture call
      if (!this.masterAudioElement) {
        console.log('[TTS-LOG] Creating new master audio element');
        this.masterAudioElement = new Audio();
        this.masterAudioElement.crossOrigin = 'anonymous';
      }
      
      // SAFARI FIX: Always re-prime the audio element during user gesture (safe no-op if already primed)
      const silentAudio = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAAW1wM1BST09mVmVyc2lvbi4wLjk5LjUAVFNTRQAAAA8AAAFMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';
      this.masterAudioElement.src = silentAudio;
      
      // Play and immediately pause to re-prime the element during user gesture
      try {
        console.log('[TTS-LOG] Re-priming audio element with silent audio');
        await this.masterAudioElement.play();
        this.masterAudioElement.pause();
        this.masterAudioElement.currentTime = 0;
        console.log('[TTS-LOG] Audio element re-primed successfully');
      } catch (error) {
        // Ignore errors on silent audio - the gesture call is what matters
        console.log('[TTS-LOG] Silent audio priming completed (error expected):', error);
      }
      
      // Set the flag synchronously. From this point on, audio is considered unlocked.
      this.isAudioUnlocked = true;
      
    } catch (error) {
      console.error('[TTS-LOG] Error unlocking audio:', error);
    }
  }

  // Stop all audio playback and cleanup
  public stopAllAudio(): void {
    // ✅ REAL AUDIO ANALYSIS: Cleanup analyser and RAF
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }
    
    if (this.currentNodes) {
      this.currentNodes.source.disconnect();
      if (this.currentNodes.gain) {
        this.currentNodes.gain.disconnect();
      }
      this.currentNodes = undefined;
    }
    
    // ✅ KEEP CACHED SOURCE: Don't set to undefined to prevent re-creation
    // The cached MediaElementSourceNode will be reused on next playback
    if (this.cachedMediaElementSource) {
      this.cachedMediaElementSource.disconnect();
      // DO NOT set to undefined - we'll reuse it
    }
    
    this.audioLevel = 0;
    this.notifyListeners();
    
    if (this.masterAudioElement) {
      this.masterAudioElement.pause();
      this.masterAudioElement.removeAttribute('src');
    }
    
    // Stop any playing audio elements (fallback)
    const allAudioElements = document.querySelectorAll('audio');
    allAudioElements.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    });
  }

  /**
   * SUSPEND AUDIO PLAYBACK - Temporarily disable audio line for microphone
   * Keeps the audio line alive but disabled, similar to microphone suspension
   */
  public suspendAudioPlayback(): void {
    console.log('[ConversationTTS] 🔇 Suspending audio playback line for microphone');
    
    // Stop current playback if any
    if (this.masterAudioElement) {
      this.masterAudioElement.pause();
      this.masterAudioElement.muted = true; // Mute instead of removing src
    }
    
    // Stop analysis but keep analyser alive
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }
    
    // Disconnect current nodes but keep cached source
    if (this.currentNodes) {
      this.currentNodes.source.disconnect();
      if (this.currentNodes.gain) {
        this.currentNodes.gain.disconnect();
      }
      this.currentNodes = undefined;
    }
    
    // Set audio level to 0 for UI
    this.audioLevel = 0;
    this.notifyListeners();
    
    console.log('[ConversationTTS] 🔇 Audio playback line suspended (kept alive)');
  }

  /**
   * RESUME AUDIO PLAYBACK - Re-enable audio line after microphone
   * Re-enables the audio line that was suspended, no need to recreate
   */
  public resumeAudioPlayback(): void {
    console.log('[ConversationTTS] 🔊 Resuming audio playback line after microphone');
    
    // Unmute the master audio element
    if (this.masterAudioElement) {
      this.masterAudioElement.muted = false;
    }
    
    // Audio line is ready for next TTS playback
    // No need to recreate anything - the cached source and analyser are still available
    console.log('[ConversationTTS] 🔊 Audio playback line resumed and ready');
  }

  /**
   * 🔥 CONVERSATION MODE OPTIMIZATION: Handle direct TTS from LLM handler
   * This method is called when the LLM handler directly triggers TTS
   */
  public handleDirectTtsResponse(chat_id: string, sessionId: string): void {
    console.log('[ConversationTTS] 🔥 CONVERSATION MODE: Handling direct TTS response');
    
    // Set conversation state to replying
    // This will be handled by the conversation overlay via the TTS completion listener
    
    // Resume audio playback line for TTS
    this.resumeAudioPlayback();
    
    // The actual TTS audio will be played by the existing audio element
    // when the LLM handler sends the audio blob to the frontend
  }

  public getCurrentAudioLevel(): number {
    return this.audioLevel;
  }

  public getMasterAudioElement(): HTMLAudioElement | null {
    return this.masterAudioElement;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l());
  }

  async speakAssistant({ chat_id, messageId, text, sessionId, onStart, onComplete }: SpeakAssistantOptions): Promise<void> {
    try {
      // Reset completion guard for new TTS
      this.isTtsCompleting = false;
      
      // Ensure audio is unlocked before proceeding
      if (!this.isAudioUnlocked || !this.masterAudioElement) {
        throw new Error('Audio is not unlocked. A user gesture is required before TTS can play.');
      }

      // SAFARI FIX: Resume AudioContext if suspended before playback
      if (this.audioContext && this.audioContext.state === 'suspended') {
        console.log('[TTS-LOG] Resuming AudioContext before TTS playback');
        await this.audioContext.resume();
      }

      // Sanitize and normalize text before TTS
      const sanitizedText = this.sanitizeTtsText(text);
      const selectedVoiceName = useChatStore.getState().ttsVoice || 'Puck';
      const googleVoiceCode = `en-US-Chirp3-HD-${selectedVoiceName}`;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_PUBLISHABLE_KEY,
      };

      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-text-to-speech`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ chat_id, text: sanitizedText, voice: googleVoiceCode, sessionId: sessionId || null })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ConversationTTS] TTS function error:', response.status, errorText);
        throw new Error(`TTS failed: ${response.status} - ${errorText}`);
      }

      // Direct blob to audio with minimal setup
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      
      // Reuse master audio element
      const audio = this.masterAudioElement;
      audio.src = audioUrl;
      audio.muted = false; // Unmute for actual playback

      // Setup audio context and analyser
      await this.setupAudioAnalysis(audio);

      // Start real-time amplitude analysis
      this.startAmplitudeAnalysis();

      // Set up cleanup listeners with completion guard - UNIFIED COMPLETION PATH
      const handleCompletion = () => {
        if (this.isTtsCompleting) {
          console.log('[ConversationTTS] TTS completion already in progress, skipping');
          return;
        }
        this.isTtsCompleting = true;
        
        this.cleanupAnalysis();
        URL.revokeObjectURL(audioUrl);
        onComplete?.(); // 🔄 SELF-HEALING: This will call resetToListening()
      };
      
      audio.addEventListener('ended', handleCompletion, { once: true });
      audio.addEventListener('error', (error) => {
        // Skip error logging if this is during silent priming (ignore priming errors)
        if (audio.src.includes('data:audio/mp3;base64,SUQz')) {
          console.log('[ConversationTTS] Silent priming error ignored (expected)');
          return;
        }
        console.error('[ConversationTTS] Audio playback error:', error);
        handleCompletion(); // 🔄 SELF-HEALING: Unified error/completion path
      }, { once: true });
      
      // Start playback and return immediately
      audio.play().then(() => {
        // Audio started successfully - trigger onStart callback
        console.log('[ConversationTTS] Audio playback started');
        onStart?.();
      }).catch(error => {
        console.error('[ConversationTTS] Audio play failed:', error);
        handleCompletion(); // 🔄 SELF-HEALING: Use unified completion path for play errors too
      });

    } catch (error) {
      console.error('[ConversationTTS] speakAssistant failed:', error);
      throw error;
    }
  }

  // ✅ REAL AUDIO ANALYSIS: Setup audio context and analyser
  private async setupAudioAnalysis(audio: HTMLAudioElement): Promise<void> {
    try {
      // AudioContext is now initialized and unlocked via the unlockAudio() method.
      // We just need to ensure it exists before proceeding with analysis setup.
      if (!this.audioContext || !this.isAudioUnlocked) {
        console.warn('[ConversationTTS] AudioContext not ready for analysis. Unlock audio first.');
        return;
      }
      
      // Resume context if suspended (it should already be running, but as a safeguard)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Setup analyser
      if (!this.analyser) {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.85;
        
        // Initialize data array for frequency analysis
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      }

      // Create or reuse MediaElementSourceNode to avoid InvalidStateError
      let source: MediaElementAudioSourceNode;
      if (this.cachedMediaElementSource) {
        // Reuse existing source
        source = this.cachedMediaElementSource;
        // Reuse existing source
        
        // Always disconnect first to prevent double connections
        source.disconnect();
      } else {
        // Create new MediaElementSourceNode only if none exists
        source = this.audioContext.createMediaElementSource(audio);
        this.cachedMediaElementSource = source;
      }

      // Connect: source -> analyser (for analysis) AND source -> destination (for audio)
      // Always connect fresh after disconnect to ensure clean state
      source.connect(this.analyser);
      source.connect(this.audioContext.destination);

      this.currentNodes = { source, gain: null };

    } catch (error) {
      console.warn('[ConversationTTS] Audio analysis setup failed - using static animation:', error);
      this.audioLevel = 0.5;
      this.notifyListeners();
    }
  }

  // ✅ REAL AUDIO ANALYSIS: Start amplitude analysis loop
  private startAmplitudeAnalysis(): void {
    if (!this.analyser || !this.dataArray) return;

    const analyzeAmplitude = () => {
      if (!this.analyser || !this.dataArray) return;

      // Get time-domain data
      const tempArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteTimeDomainData(tempArray);
      
      // Copy to our instance array for processing
      for (let i = 0; i < tempArray.length; i++) {
        this.dataArray[i] = tempArray[i];
      }

      // Compute RMS amplitude
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        const v = (this.dataArray[i] - 128) / 128; // Convert to -1..1
        sum += v * v;
      }
      const rms = Math.sqrt(sum / this.dataArray.length);

      // Map RMS to 0..1 with threshold and smoothing
      const level = Math.max(0, Math.min(1, (rms - 0.02) / 0.3));
      
      // Smooth the level changes
      this.audioLevel = this.audioLevel * 0.8 + level * 0.2;
      this.notifyListeners();

      // Continue analysis
      this.rafId = requestAnimationFrame(analyzeAmplitude);
    };

    this.rafId = requestAnimationFrame(analyzeAmplitude);
  }

  // ✅ REAL AUDIO ANALYSIS: Cleanup analysis
  private cleanupAnalysis(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }
    
    if (this.currentNodes) {
      this.currentNodes.source.disconnect();
      if (this.currentNodes.gain) {
        this.currentNodes.gain.disconnect();
      }
      this.currentNodes = undefined;
    }
    
    this.audioLevel = 0;
    this.notifyListeners();
  }

  /**
   * RESET ALL FLAGS: Reset all internal state flags for clean modal reopen
   */
  public resetAllFlags(): void {
    console.log('[ConversationTTS] Resetting all state flags for clean modal reopen');
    
    // Reset completion guard
    this.isTtsCompleting = false;
    
    // Reset audio level
    this.audioLevel = 0;
    this.notifyListeners();
    
    console.log('[ConversationTTS] All TTS state flags reset');
  }

  // ✅ FULL DISPOSAL METHOD: Complete teardown for modal close (optional)
  public resetAllAndDispose(): void {
    this.stopAllAudio();
    
    // Fully dispose cached source
    if (this.cachedMediaElementSource) {
      this.cachedMediaElementSource.disconnect();
      this.cachedMediaElementSource = undefined;
    }
    
    // Dispose AudioContext if desired (aggressive cleanup)
    if (this.audioContext) {
      this.audioContext.close().catch(err => 
        console.warn('[TTS-LOG] AudioContext close failed:', err)
      );
      this.audioContext = undefined;
    }
    
    // Dispose master audio element
    if (this.masterAudioElement) {
      this.masterAudioElement.pause();
      this.masterAudioElement.removeAttribute('src');
      this.masterAudioElement = null;
    }
    
    // Reset analyser
    this.analyser = undefined;
    this.dataArray = undefined;
    this.isAudioUnlocked = false;
    
    // Complete TTS disposal completed
  }

  /**
   * Play audio from URL - routes through TTS service for proper animation
   */
  public async playFromUrl(audioUrl: string, onComplete?: () => void): Promise<void> {
    try {
      // Reset completion guard for new playback
      this.isTtsCompleting = false;
      
      // Ensure audio is unlocked
      if (!this.isAudioUnlocked || !this.masterAudioElement) {
        console.warn('[ConversationTTS] Audio not unlocked - cannot play from URL');
        onComplete?.(); // 🔄 SELF-HEALING: Call completion to trigger resetToListening
        return;
      }

      // SAFARI FIX: Resume AudioContext if suspended before playback
      if (this.audioContext && this.audioContext.state === 'suspended') {
        console.log('[TTS-LOG] Resuming AudioContext before URL playback');
        await this.audioContext.resume();
      }

      // Reset completion guard
      this.isTtsCompleting = false;

      // Set up master audio element
      const audio = this.masterAudioElement;
      audio.src = audioUrl;
      audio.muted = false;

      // Setup audio analysis for animation
      await this.setupAudioAnalysis(audio);
      this.startAmplitudeAnalysis();

      // Set up event listeners
      const handleEnded = () => {
        if (this.isTtsCompleting) return;
        this.isTtsCompleting = true;
        this.cleanupAnalysis();
        onComplete?.();
      };

      const handleError = (error: Event) => {
        if (this.isTtsCompleting) return;
        this.isTtsCompleting = true;
        console.error('[ConversationTTS] Audio playback error:', error);
        this.cleanupAnalysis();
        onComplete?.();
      };

      audio.addEventListener('ended', handleEnded, { once: true });
      audio.addEventListener('error', handleError, { once: true });

      // Start playback
      await audio.play();
      console.log('[ConversationTTS] Audio playback started from URL');

    } catch (error) {
      console.error('[ConversationTTS] playFromUrl failed:', error);
      this.cleanupAnalysis();
      onComplete?.();
    }
  }

  // Sanitize text before sending to TTS provider
  private sanitizeTtsText(input: string): string {
    if (!input) return '';
    let t = input;
    // Remove code blocks
    t = t.replace(/```[\s\S]*?```/g, ' ');
    // Strip inline code/backticks
    t = t.replace(/`+/g, '');
    // Remove markdown headers/emphasis/quotes
    t = t.replace(/[#*_>]+/g, ' ');
    // Collapse whitespace
    t = t.replace(/\s+/g, ' ').trim();
    return t;
  }
}

export const conversationTtsService = new ConversationTtsService();
