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

  // ✅ VOICE SESSION MANAGEMENT
  private voiceSessionStarted = false;
  private cachedMicStream: MediaStream | null = null;
  private contextId: string | null = null;
  private contextCreatedAt: number | null = null;
  private audioElementId: string | null = null;
  private persistentMediaSource: MediaElementAudioSourceNode | null = null;

  /**
   * Idempotent voice session starter - handles both mic access and audio playback permission
   * together on the first user gesture. Guards against double-start.
   */
  public async startVoiceSession(): Promise<void> {
    // Guard against double-start
    if (this.voiceSessionStarted) {
      console.log('[voice] session already started, returning early');
      return;
    }

    this.voiceSessionStarted = true;

    try {
      const results = await Promise.allSettled([
        this.getMicOnce(),
        this.startAudioSession()
      ]);

      // Structured logging for session status
      const micResult = results[0];
      const audioResult = results[1];
      
      const micGranted = micResult.status === 'fulfilled' && !!this.cachedMicStream;
      const trackCount = this.cachedMicStream?.getAudioTracks().length || 0;
      const ctxState = this.audioContext?.state || 'unknown';

      console.log('[voice] session', {
        micGranted,
        trackCount,
        ctxState
      });

      // Log any rejections
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const serviceName = index === 0 ? 'getMicOnce' : 'startAudioSession';
          console.error('[voice] session rejection', {
            name: serviceName,
            message: result.reason?.message || 'Unknown error',
            stack: result.reason?.stack
          });
        }
      });

      // Register visibility change handler for AudioContext resume
      this.setupVisibilityHandler();

    } catch (error) {
      console.error('[voice] session startup failed', error);
      this.voiceSessionStarted = false; // Reset flag on failure
      throw error;
    }
  }

  /**
   * Get microphone access once and cache the persistent MediaStream
   */
  private async getMicOnce(): Promise<MediaStream> {
    // Return cached stream if it already exists
    if (this.cachedMicStream) {
      return this.cachedMicStream;
    }

    // Request new stream
    this.cachedMicStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
      }
    });

    return this.cachedMicStream;
  }

  /**
   * Start audio session - create single persistent AudioContext and audio element
   */
  private async startAudioSession(): Promise<void> {
    if (!this.audioContext) {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        this.contextId = `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.contextCreatedAt = Date.now();
      } else {
        throw new Error('AudioContext not supported');
      }
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Create single persistent audio element
    if (!this.masterAudioElement) {
      this.masterAudioElement = new Audio();
      this.audioElementId = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.masterAudioElement.muted = true;
      
      // Prime the audio element with user gesture
      await this.masterAudioElement.play().catch(() => {
        // Expected to fail with empty source, but unlocks audio for iOS
      });
      
      // Create single persistent MediaElementSourceNode
      this.persistentMediaSource = this.audioContext.createMediaElementSource(this.masterAudioElement);
      
      // Setup analyser once
      if (!this.analyser) {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.85;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      }
      
      // Connect persistent pipeline: source -> analyser -> destination
      this.persistentMediaSource.connect(this.analyser);
      this.persistentMediaSource.connect(this.audioContext.destination);
    }

    this.isAudioUnlocked = true;
    
    // Log session start with stable identities
    console.log('[voice] session-start', {
      contextId: this.contextId,
      createdAt: new Date(this.contextCreatedAt || 0).toISOString(),
      ctxState: this.audioContext.state,
      audioElId: this.audioElementId,
      micActive: this.cachedMicStream?.getAudioTracks().some(t => t.readyState === 'live') || false
    });
  }

  /**
   * Setup visibility change handler for AudioContext resume
   */
  private setupVisibilityHandler(): void {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          console.log('[voice] resume', { ctxState: this.audioContext?.state });
        }).catch(err => {
          console.error('[voice] resume failed', err);
        });
      }
    });
  }

  /**
   * End voice session - cleanup mic and audio context
   */
  public endSession(): void {
    // Stop microphone
    if (this.cachedMicStream) {
      this.cachedMicStream.getTracks().forEach(track => track.stop());
      this.cachedMicStream = null;
    }

    // Stop analysis
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }

    // Disconnect persistent pipeline
    if (this.persistentMediaSource) {
      this.persistentMediaSource.disconnect();
      this.persistentMediaSource = null;
    }

    // Clean up audio element
    if (this.masterAudioElement) {
      this.masterAudioElement.pause();
      this.masterAudioElement.src = '';
      this.masterAudioElement = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = undefined;
    }

    // Reset session state
    this.voiceSessionStarted = false;
    this.isAudioUnlocked = false;
    this.contextId = null;
    this.contextCreatedAt = null;
    this.audioElementId = null;
    this.analyser = undefined;
    this.dataArray = undefined;
    this.audioLevel = 0;
    this.notifyListeners();
  }

  /**
   * Get cached microphone stream
   */
  public getCachedMicStream(): MediaStream | null {
    return this.cachedMicStream;
  }



  // Stop current audio playback without breaking session
  public stopAllAudio(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }
    
    if (this.masterAudioElement) {
      this.masterAudioElement.pause();
      this.masterAudioElement.currentTime = 0;
    }
    
    this.audioLevel = 0;
    this.notifyListeners();
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
        
        // Ensure voice session is active
        if (!this.voiceSessionStarted || !this.isAudioUnlocked || !this.masterAudioElement || !this.audioContext) {
          throw new Error('Voice session not started. Call startVoiceSession() first.');
        }

        // Log before each TTS with stable identities
        console.log('[voice] pre-tts', {
          contextId: this.contextId,
          createdAt: new Date(this.contextCreatedAt || 0).toISOString(),
          ctxState: this.audioContext.state,
          audioElId: this.audioElementId,
          micActive: this.cachedMicStream?.getAudioTracks().some(t => t.readyState === 'live') || false
        });

        // Resume AudioContext if suspended (Safari behavior)
        if (this.audioContext.state === 'suspended') {
          console.log('[voice] resuming suspended context');
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
          console.error('[voice] TTS function error:', response.status, errorText);
        throw new Error(`TTS failed: ${response.status} - ${errorText}`);
      }

        // Use persistent audio element and pipeline
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        
        // Reuse the same persistent audio element - no new creation
        this.masterAudioElement.src = audioUrl;
        this.masterAudioElement.muted = false; // Unmute for actual playback

        // Start real-time amplitude analysis using persistent pipeline
        this.startAmplitudeAnalysis();

        // Event listeners with cleanup
        const handleEnded = () => {
          this.cleanupAnalysis();
          URL.revokeObjectURL(audioUrl);
          this.masterAudioElement?.removeEventListener('ended', handleEnded);
          this.masterAudioElement?.removeEventListener('error', handleError);
          resolve();
        };
        
        const handleError = (error: Event) => {
          console.error('[voice] Audio playback error:', error);
          this.cleanupAnalysis();
          URL.revokeObjectURL(audioUrl);
          this.masterAudioElement?.removeEventListener('ended', handleEnded);
          this.masterAudioElement?.removeEventListener('error', handleError);
          reject(error);
        };

        this.masterAudioElement.addEventListener('ended', handleEnded);
        this.masterAudioElement.addEventListener('error', handleError);
        
        // Play using persistent audio element - no new audio creation
        console.log(`[voice] playing with persistent element, ctx state: ${this.audioContext.state}`);
        try {
          await this.masterAudioElement.play();
          console.log('[voice] audio.play() resolved successfully');
        } catch (error) {
          console.error('[voice] audio.play() failed:', error);
          this.cleanupAnalysis();
          URL.revokeObjectURL(audioUrl);
          this.masterAudioElement.removeEventListener('ended', handleEnded);
          this.masterAudioElement.removeEventListener('error', handleError);
          reject(error);
          return;
        }
        
      } catch (error) {
        console.error('[voice] speakAssistant failed:', error);
            reject(error);
          }
    });
  }



  // ✅ REAL AUDIO ANALYSIS: Start amplitude analysis loop using persistent pipeline
  private startAmplitudeAnalysis(): void {
    if (!this.analyser || !this.dataArray || !this.masterAudioElement) return;

    const analyzeAmplitude = () => {
      if (!this.analyser || !this.dataArray || !this.masterAudioElement || this.masterAudioElement.paused) {
        // Stop analysis if audio is paused/ended
        this.audioLevel = 0;
        this.notifyListeners();
        this.rafId = undefined;
        return;
      }

      // Get time-domain data from persistent analyser
      this.analyser.getByteTimeDomainData(this.dataArray);

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

    // Stop any existing analysis before starting new one
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.rafId = requestAnimationFrame(analyzeAmplitude);
  }

  // ✅ REAL AUDIO ANALYSIS: Cleanup analysis (but keep persistent pipeline)
  private cleanupAnalysis(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }
    
    // Do NOT disconnect persistent pipeline - it stays connected for the session
    // Only reset the audio level
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
