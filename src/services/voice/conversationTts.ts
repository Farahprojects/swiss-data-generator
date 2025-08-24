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
    
    // Clear cached MediaElementSourceNode
    if (this.cachedMediaElementSource) {
      this.cachedMediaElementSource.disconnect();
      this.cachedMediaElementSource = undefined;
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
    
    return new Promise(async (resolve, reject) => {
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

        // ✅ REAL AUDIO ANALYSIS: Event listeners with cleanup
        audio.addEventListener('ended', () => {
          this.cleanupAnalysis();
          URL.revokeObjectURL(audioUrl);
          resolve();
        });
        
        audio.addEventListener('error', (error) => {
          console.error('[ConversationTTS] Audio playback error:', error);
          this.cleanupAnalysis();
          URL.revokeObjectURL(audioUrl);
          reject(error);
        });
        
        // ✅ SIMPLIFIED: Play immediately without load() call
        console.log(`[TTS-LOG] About to play audio. AudioContext state: ${this.audioContext?.state}`);
        try {
          await audio.play();
          console.log('[TTS-LOG] audio.play() promise resolved successfully.');
        } catch (error) {
          console.error('[TTS-LOG] audio.play() promise rejected with error:', error);
          this.cleanupAnalysis();
          URL.revokeObjectURL(audioUrl);
          reject(error);
          return;
        }
        
      } catch (error) {
        console.error('[ConversationTTS] speakAssistant failed:', error);
        reject(error);
      }
    });
  }

  // ✅ REAL AUDIO ANALYSIS: Setup audio context and analyser
  private async setupAudioAnalysis(audio: HTMLAudioElement): Promise<void> {
    try {
      if (!this.audioContext || !this.isAudioUnlocked) {
        console.warn('[TTS-Animation] AudioContext not ready for analysis. Unlock audio first.');
        return;
      }
      
      // Defensively resume context if it's suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // --- SIMPLIFIED CONNECTION LOGIC ---
      // 1. Disconnect any existing source from the previous playback to ensure a clean slate.
      if (this.currentNodes) {
        this.currentNodes.source.disconnect();
        if (this.currentNodes.gain) this.currentNodes.gain.disconnect();
        this.currentNodes = undefined;
      }

      // 2. Create the analyser if it doesn't exist.
      if (!this.analyser) {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.85;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      }

      // 3. Always create a new source node. This is the most reliable method.
      const source = this.audioContext.createMediaElementSource(audio);
      
      // 4. Connect the new source to the analyser and the audio output.
      source.connect(this.analyser);
      source.connect(this.audioContext.destination);

      this.currentNodes = { source, gain: null };
      console.log('[TTS-Animation] New analysis connection established.');

    } catch (error) {
      console.warn('[TTS-Animation] Audio analysis setup failed:', error);
      // Fallback to a static animation if setup fails
      this.audioLevel = 0.5; 
      this.notifyListeners();
    }
  }

  // ✅ REAL AUDIO ANALYSIS: Start amplitude analysis loop
  private startAmplitudeAnalysis(): void {
    if (!this.analyser || !this.dataArray || !this.masterAudioElement) return;

    const audio = this.masterAudioElement;

    // --- Animation Watchdog (Self-Healing) ---
    // After 250ms, check if the animation has started. If not, re-initialize.
    const watchdogTimeout = setTimeout(() => {
      if (audio && !audio.paused && this.audioLevel === 0) {
        console.warn('[TTS-Animation] Watchdog: Animation appears stalled. Re-initializing analysis.');
        this.setupAudioAnalysis(audio).catch(err => console.error('[TTS-Animation] Watchdog re-init failed:', err));
      }
    }, 250);

    const analyzeAmplitude = () => {
      if (!this.analyser || !this.dataArray || audio.paused) {
        // Stop the loop if analyser is gone or audio is paused/ended
        this.audioLevel = 0;
        this.notifyListeners();
        clearTimeout(watchdogTimeout); // Clear watchdog on clean exit
        this.rafId = undefined;
        return;
      }
      
      this.analyser.getByteTimeDomainData(this.dataArray);
      let sumSquares = 0.0;
      for (const amplitude of this.dataArray) {
        const normalized = (amplitude / 128.0) - 1.0;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / this.dataArray.length);

      // Smooth the level for a more pleasant animation
      const smoothedLevel = Math.max(this.audioLevel * 0.8, rms);
      this.audioLevel = Math.min(smoothedLevel, 1.0);
      
      this.notifyListeners();

      this.rafId = requestAnimationFrame(analyzeAmplitude);
    };

    // Stop any previous animation frame loop before starting a new one
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
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
