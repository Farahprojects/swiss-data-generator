// src/services/voice/conversationTts.ts
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';

export interface SpeakAssistantOptions {
  chat_id: string;
  messageId: string;
  text: string;
  sessionId?: string | null;
}

export class ConversationTtsServiceClass {
  private audioContext: AudioContext | undefined;
  private analyser: AnalyserNode | undefined;
  private masterAudioElement: HTMLAudioElement | null = null;
  private persistentMediaSource: MediaElementAudioSourceNode | undefined;
  private audioLevel = 0;
  private listeners = new Set<() => void>();
  private rafId: number | undefined;
  private isAudioUnlocked = false;
  private cachedMicStream: MediaStream | null = null;
  private voiceSessionStarted = false;
  private contextId: string | null = null;
  private contextCreatedAt: string | null = null;
  private audioElementId: string | null = null;
  private playbackUnlocked = false;
  private micGranted = false;
  private dataArray: Float32Array | null = null;

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(message: string, data?: any): void {
    console.log(`[voice] ${message}`, data);
  }

  private error(message: string, error?: any): void {
    console.error(`[voice] ${message}`, error);
  }

  /**
   * Main session entry point, called on first user gesture.
   * Attempts to open both playback and microphone gates in parallel.
   */
  public async startVoiceSession(): Promise<void> {
    if (this.voiceSessionStarted) {
      this.log('[voice] session-start-skipped: Session already started.');
      return;
    }
    this.log('[voice] session-start: Opening mic and playback gates in parallel...');

    const unlockPlayback = async () => {
        await this.ensureAudioContext();
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        if (this.audioContext?.state !== 'running') {
            throw new Error(`AudioContext did not resume. State: ${this.audioContext?.state}`);
        }
    };

    const grantMic = async () => {
        const stream = await this.getMicOnce();
        if (!stream || stream.getAudioTracks().length === 0) {
            throw new Error('Microphone stream not available or has no tracks.');
        }
    };
    
    const [playbackResult, micResult] = await Promise.allSettled([unlockPlayback(), grantMic()]);
    
    if (playbackResult.status === 'fulfilled') {
        this.playbackUnlocked = true;
        this.log('[voice] playbackUnlocked: AudioContext is running.');
    } else {
        this.error('[voice] playback-unlock-failed:', playbackResult.reason);
    }

    if (micResult.status === 'fulfilled') {
        this.micGranted = true;
        this.log('[voice] micGranted: Microphone access is granted.');
    } else {
        this.error('[voice] mic-grant-failed:', micResult.reason);
    }
    
    this.voiceSessionStarted = true;

    if (!this.playbackUnlocked || !this.micGranted) {
        throw new Error('One or more permission gates failed to open. Check console for details.');
    }
    
    // Both gates are open, now set up the full audio pipeline for speaking.
    await this.startAudioSession();
    this.setupVisibilityHandler();
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
        this.contextCreatedAt = Date.now().toString();
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
        this.dataArray = new Float32Array(this.analyser.frequencyBinCount);
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
      this.persistentMediaSource = undefined;
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
    this.playbackUnlocked = false;
    this.micGranted = false;
    this.log('[voice] session-end: All resources released.');
  }

  /**
   * Probes the browser's audio system to determine if a user gesture is required.
   * This should be called before starting a voice session to decide whether to show a "Tap to Start" screen.
   * @returns {Promise<boolean>} - True if a gesture is required, false otherwise.
   */
  public async probeAudioPermissions(): Promise<boolean> {
    console.log('[voice] probe: Probing audio permissions...');
    await this.ensureAudioContext();
    if (this.audioContext) {
      const gestureRequired = this.audioContext.state === 'suspended';
      console.log(`[voice] probe-result: AudioContext state is '${this.audioContext.state}'. Gesture required: ${gestureRequired}`);
      return gestureRequired;
    }
    console.error('[voice] probe-error: AudioContext could not be initialized.');
    return true; // Assume gesture is required if context fails
  }

  /**
   * Ensures the master AudioContext is initialized.
   * @private
   */
  private async ensureAudioContext(): Promise<void> {
    if (this.audioContext) {
      return;
    }
    try {
      console.log('[voice] ctx: Creating new master AudioContext.');
      // @ts-ignore
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      this.contextId = `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.contextCreatedAt = Date.now().toString();
      console.log(`[voice] ctx-created: ID ${this.contextId}, State: ${this.audioContext.state}`);
    } catch (e) {
      console.error('[voice] ctx-error: Failed to create AudioContext.', e);
      this.audioContext = null;
    }
  }

  /**
   * Get cached microphone stream
   */
  public getCachedMicStream(): MediaStream | null {
    return this.cachedMicStream;
  }
  
  /**
   * Get shared AudioContext
   */
  public getSharedAudioContext(): AudioContext | undefined {
    return this.audioContext;
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

  /**
   * Stop and reset audio for strict sequential flow
   * Immediately stop current playback and reset for next speak
   */
  public stopAndReset(): void {
    console.log('[voice] stop-and-reset called');
    
    // Stop analysis immediately
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = undefined;
    }
    
    if (this.masterAudioElement) {
      // Log before reset with stable identities
      console.log('[voice] pre-reset', {
        contextId: this.contextId,
        audioElId: this.audioElementId,
        ctxState: this.audioContext?.state,
        hasSrc: !!this.masterAudioElement.src
      });
      
      // Immediate stop and reset
      this.masterAudioElement.pause();
      this.masterAudioElement.currentTime = 0;
      
      // Revoke current object URL if it exists
      if (this.masterAudioElement.src && this.masterAudioElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.masterAudioElement.src);
      }
      
      // Clear src completely
      this.masterAudioElement.src = '';
      this.masterAudioElement.removeAttribute('src');
      this.masterAudioElement.load(); // Reset element to idle state
      
      // Log after reset
      console.log('[voice] post-reset', {
        contextId: this.contextId,
        audioElId: this.audioElementId,
        hasSrc: !!this.masterAudioElement.src
      });
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

        // If a speak request arrives early, do stop-and-reset immediately
        this.stopAndReset();
        
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
      this.analyser.getFloatTimeDomainData(this.dataArray as any);

      // Compute RMS amplitude
      let sum = 0;
      for (let i = 0; i < this.dataArray.length; i++) {
        const v = this.dataArray[i]; // Already in -1..1 range with Float32Array
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

export const conversationTtsService = new ConversationTtsServiceClass();
