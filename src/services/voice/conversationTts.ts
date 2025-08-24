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
    
    this.audioLevel = 0;
    this.notifyListeners();
    
    // Stop any playing audio elements
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
        // ✅ TTS TIMING: T5 - TTS service started
        console.log(`[TTS-TIMING] T5 - TTS service started at ${new Date().toISOString()}`, {
          messageId,
          textLength: text.length,
          chatId: chat_id
        });
        
        // Sanitize and normalize text before TTS
        const sanitizedText = this.sanitizeTtsText(text);
        const selectedVoiceName = useChatStore.getState().ttsVoice || 'Puck';
        const googleVoiceCode = `en-US-Chirp3-HD-${selectedVoiceName}`;

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLISHABLE_KEY,
        };

        // ✅ TTS TIMING: T7 - About to call TTS edge function
        console.log(`[TTS-TIMING] T7 - About to call TTS edge function at ${new Date().toISOString()}`, {
          messageId,
          textLength: sanitizedText.length,
          voiceCode: googleVoiceCode
        });

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

        // ✅ TTS TIMING: T8 - TTS edge function response received
        console.log(`[TTS-TIMING] T8 - TTS edge function response received at ${new Date().toISOString()}`, {
          messageId,
          responseStatus: response.status,
          responseSize: response.headers.get('content-length') || 'unknown'
        });

        // ✅ SIMPLIFIED: Direct blob to audio with minimal setup
        const blob = await response.blob();
        
        // ✅ TTS TIMING: T9 - Audio blob created
        console.log(`[TTS-TIMING] T9 - Audio blob created at ${new Date().toISOString()}`, {
          messageId,
          blobSize: blob.size,
          blobType: blob.type
        });
        
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);

        // ✅ REAL AUDIO ANALYSIS: Setup audio context and analyser
        await this.setupAudioAnalysis(audio);

        // ✅ TTS TIMING: T10 - Audio analysis setup completed
        console.log(`[TTS-TIMING] T10 - Audio analysis setup completed at ${new Date().toISOString()}`, {
          messageId
        });

        // Start real-time amplitude analysis
        this.startAmplitudeAnalysis();

        // ✅ TTS TIMING: T11 - About to start audio playback
        console.log(`[TTS-TIMING] T11 - About to start audio playback at ${new Date().toISOString()}`, {
          messageId
        });

        // ✅ REAL AUDIO ANALYSIS: Event listeners with cleanup
        audio.addEventListener('ended', () => {
          // ✅ TTS TIMING: T12 - Audio playback ended
          console.log(`[TTS-TIMING] T12 - Audio playback ended at ${new Date().toISOString()}`, {
            messageId
          });
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
        await audio.play();
        
        // ✅ TTS TIMING: T13 - Audio playback started
        console.log(`[TTS-TIMING] T13 - Audio playback started at ${new Date().toISOString()}`, {
          messageId
        });
        
      } catch (error) {
        console.error('[ConversationTTS] speakAssistant failed:', error);
        reject(error);
      }
    });
  }

  async getFallbackAudio(chat_id: string, text: string, sessionId?: string | null): Promise<string> {
    try {
      const selectedVoiceName = useChatStore.getState().ttsVoice || 'Puck';
      const googleVoiceCode = 'en-US-Standard-C'; // Use a known working fallback voice

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_PUBLISHABLE_KEY,
      };

      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-text-to-speech`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ chat_id, text: this.sanitizeTtsText(text), voice: googleVoiceCode, sessionId: sessionId || null })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS fallback failed: ${response.status} - ${errorText}`);
      }
      
      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);

    } catch (error) {
      console.error('[ConversationTTS] getFallbackAudio failed:', error);
      throw error;
    }
  }

  // ✅ REAL AUDIO ANALYSIS: Setup audio context and analyser
  private async setupAudioAnalysis(audio: HTMLAudioElement): Promise<void> {
    try {
      // Create AudioContext with fallback
      if (!this.audioContext) {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          console.warn('[ConversationTTS] AudioContext not supported - using static animation');
          this.audioLevel = 0.5;
          this.notifyListeners();
          return;
        }
        this.audioContext = new AudioContextClass();
      }

      // Resume context if suspended
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

      // Create source node
      const source = this.audioContext.createMediaElementSource(audio);

      // Connect: source -> analyser (for analysis) AND source -> destination (for audio)
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
