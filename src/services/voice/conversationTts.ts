// src/services/voice/conversationTts.ts
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';

export interface SpeakAssistantOptions {
  chat_id: string;
  messageId: string;
  text: string;
  sessionId?: string | null;
}

class ConversationTtsService {
  private audioLevel = 0;
  private listeners = new Set<() => void>();

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
   */
  public unlockAudio(): void {
    if (this.isAudioUnlocked) return;

    try {
      // 1. Initialize and resume AudioContext
      if (!this.audioContext) {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
          console.log('[TTS-LOG] AudioContext created.');
        } else {
          console.warn('[TTS-LOG] AudioContext not supported.');
          return;
        }
      }

      // This can be called multiple times, it's safe.
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(err => console.error('[TTS-LOG] Failed to resume AudioContext', err));
      }

      // 2. Create and "prime" the master audio element
      if (!this.masterAudioElement) {
        this.masterAudioElement = new Audio();
        this.masterAudioElement.muted = true;
        
        // Call play() to unlock it. We don't need to await. The call itself is the key.
        // This will likely throw an empty-source error, which we safely ignore.
        this.masterAudioElement.play().catch(() => {
          // This catch is to prevent unhandled promise rejection warnings.
        });
        
        console.log('[TTS-LOG] Master audio element created and primed.');
      }
      
      // Set the flag synchronously. From this point on, audio is considered unlocked.
      this.isAudioUnlocked = true;
      console.log(`[TTS-LOG] Audio systems unlocked. AudioContext state: ${this.audioContext.state}`);
      
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

  public getCurrentAudioLevel(): number {
    return this.audioLevel;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l());
  }

  async speakAssistant({ chat_id, messageId, text, sessionId }: SpeakAssistantOptions): Promise<void> {
    try {
      
      // Ensure audio is unlocked before proceeding
      if (!this.isAudioUnlocked || !this.masterAudioElement) {
        throw new Error('Audio is not unlocked. A user gesture is required before TTS can play.');
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

      // ✅ SIMPLIFIED: Direct blob to audio with minimal setup
      const blob = await response.blob();
      
      const audioUrl = URL.createObjectURL(blob);
      // ✅ REUSE MASTER AUDIO ELEMENT: Instead of creating a new one
      const audio = this.masterAudioElement;
      audio.src = audioUrl;
      audio.muted = false; // Unmute for actual playback

      // ✅ REAL AUDIO ANALYSIS: Setup audio context and analyser
      await this.setupAudioAnalysis(audio);

      // Start real-time amplitude analysis
      this.startAmplitudeAnalysis();

      // ✅ FIRE-AND-FORGET: Set up cleanup listeners but don't wait for them
      audio.addEventListener('ended', () => {
        this.cleanupAnalysis();
        URL.revokeObjectURL(audioUrl);
        console.log('[ConversationTTS] Audio playback completed');
      }, { once: true });
      
      audio.addEventListener('error', (error) => {
        console.error('[ConversationTTS] Audio playback error:', error);
        this.cleanupAnalysis();
        URL.revokeObjectURL(audioUrl);
      }, { once: true });
      
      // ✅ FIRE-AND-FORGET: Start playback and return immediately
      console.log(`[TTS-LOG] Starting audio playback. AudioContext state: ${this.audioContext?.state}`);
      audio.play().catch(error => {
        console.error('[TTS-LOG] Audio play failed:', error);
        this.cleanupAnalysis();
        URL.revokeObjectURL(audioUrl);
      });
      
      // Return immediately - don't wait for audio to finish
      console.log('[ConversationTTS] TTS started successfully - returning immediately');
      
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
        console.log('[TTS-LOG] Reusing existing MediaElementSourceNode');
        
        // Always disconnect first to prevent double connections
        source.disconnect();
      } else {
        // Create new MediaElementSourceNode only if none exists
        console.log('[TTS-LOG] Creating new MediaElementSourceNode');
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
    
    console.log('[TTS-LOG] Complete TTS disposal completed');
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
