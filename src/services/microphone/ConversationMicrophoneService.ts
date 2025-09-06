/**
 * 🎙️ CONVERSATION MICROPHONE SERVICE - Streamlined Version
 * 
 * Handles microphone functionality for AI conversation recording.
 * Simplified to essential functionality only.
 */

import { audioArbitrator } from '@/services/audio/AudioArbitrator';
import { RollingBufferVAD } from './vad/RollingBufferVAD';

export interface ConversationMicrophoneOptions {
  onRecordingComplete?: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
  onSilenceDetected?: () => void;
  silenceTimeoutMs?: number;
}

export class ConversationMicrophoneServiceClass {
  private stream: MediaStream | null = null;
  private rollingBufferVAD: RollingBufferVAD | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private isRecording = false;
  private isPaused = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private audioLevel = 0;
  private currentTurnId: string | null = null;
  private options: ConversationMicrophoneOptions = {};
  private listeners = new Set<() => void>();
  
  // REMOVED: Old VAD state tracking - handled by new VAD system

  constructor(options: ConversationMicrophoneOptions = {}) {
    this.options = options;
  }

  /**
   * Initialize service with options
   */
  initialize(options: ConversationMicrophoneOptions): void {
    this.options = { ...this.options, ...options };
  }


  /**
   * Start recording - ATOMIC: Clean then start
   */
  public async startRecording(): Promise<boolean> {
    // CRITICAL: Clean media source BEFORE starting to prevent race conditions
    this.forceCleanup();
    console.log('[ConversationMic] 🧹 Media source cleaned before start');
    
    // Request audio control
    if (!audioArbitrator.requestControl('microphone')) {
      console.error('[ConversationMic] Cannot start - TTS is active');
      return false;
    }

    // Check if modal is still open
    try {
      const { useConversationUIStore } = await import('@/features/chat/conversation-ui-store');
      const conversationStore = useConversationUIStore.getState();
      if (!conversationStore.isConversationOpen) {
        return false;
      }
    } catch (error) {
      console.error('[ConversationMic] Failed to check modal state:', error);
      return false;
    }

    // Generate turn ID
    const turnId = `turn-${Date.now()}`;
    this.currentTurnId = turnId;

    try {
      // CACHE-FREE: Create fresh MediaStream for each turn to prevent format issues
      console.log('[ConversationMic] 🆕 Creating fresh MediaStream for turn:', turnId);
      
      // Detect Chrome and log Chrome mode
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
      if (isChrome) {
        console.log('[ConversationMic] 🌐 CHROME DETECTED - Using Chrome mode for media source');
      }
      
      // Chrome-optimized: Explicit sample rate and channel count
      const audioConstraints = {
        sampleRate: { ideal: 48000 },    // 48kHz for Whisper compatibility
        channelCount: { ideal: 1 },      // Mono channel
        echoCancellation: true,          // Clean input
        noiseSuppression: true,          // Remove background noise
        autoGainControl: true            // Consistent levels
      };
      
      // USER GESTURE ENFORCEMENT: getUserMedia only called on user tap/click
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });

      // Validate fresh stream
      if (!this.stream || this.stream.getAudioTracks().length === 0) {
        console.error('[ConversationMic] No audio tracks available in fresh stream');
        return false;
      }

      const audioTrack = this.stream.getAudioTracks()[0];
      if (audioTrack.readyState !== 'live') {
        console.error('[ConversationMic] Fresh audio track not ready:', audioTrack.readyState);
        return false;
      }

      // Log fresh stream settings for debugging
      const trackSettings = audioTrack.getSettings();
      console.log('[ConversationMic] 🎛️ Fresh stream settings:', trackSettings);

      // Create fresh AudioContext for each turn to prevent stale data
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(() => {});
      }
      // Universal: Let browser choose optimal settings
      this.audioContext = new AudioContext();

      // Create audio analysis chain
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.8;
      this.mediaStreamSource.connect(this.analyser);
      
      // Create MediaRecorder with Chrome-optimized format
      const mrOptions: MediaRecorderOptions = {};
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mrOptions.mimeType = 'audio/webm;codecs=opus';
          console.log('[ConversationMic] ✅ Using audio/webm;codecs=opus (Chrome-optimized)');
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mrOptions.mimeType = 'audio/webm';
          console.log('[ConversationMic] ⚠️ Using audio/webm (fallback)');
        } else {
          console.log('[ConversationMic] ⚠️ Using browser default mimeType');
        }
      }
      this.mediaRecorder = new MediaRecorder(this.stream, mrOptions);

      // Create VAD
      this.rollingBufferVAD = new RollingBufferVAD({
        lookbackWindowMs: 15000,
        chunkDurationMs: 200,
        preRollMs: 250,
        postRollMs: 150,
        pruneOnUtterance: true,
        voiceThreshold: 0.012,
        silenceThreshold: 0.008,
        voiceConfirmMs: 300,
        silenceTimeoutMs: this.options.silenceTimeoutMs || 1500,
        maxUtteranceMs: 15000,
        minUtteranceMs: 250,
        onVoiceStart: () => {
          console.log('[ConversationMic] 🎤 Voice activity detected');
        },
        onUtterance: (blob: Blob) => {
          console.log('[ConversationMic] 🔇 Utterance detected, processing speech');
          if (this.currentTurnId === turnId && this.options.onRecordingComplete) {
            this.options.onRecordingComplete(blob);
          }
        },
        onSilenceDetected: (blob?: Blob) => {
          // Back-compat: also handle onSilenceDetected
          if (blob && this.currentTurnId === turnId && this.options.onRecordingComplete) {
            this.options.onRecordingComplete(blob);
          }
        },
        onError: (error: Error) => {
          console.error('[ConversationMic] VAD error:', error);
          if (this.options.onError) {
            this.options.onError(error);
          }
        }
      });

      this.isRecording = true;
      audioArbitrator.setMicrophoneState('active');

      // Start VAD with MediaRecorder (created by service layer for user gesture enforcement)
      await this.rollingBufferVAD.start(this.stream, this.mediaRecorder, this.audioContext);

      this.notifyListeners();
      return true;

    } catch (error) {
      console.error('[ConversationMic] Recording setup failed:', error);
      this.audioLevel = 0;
      if (this.options.onError) {
        this.options.onError(error);
      }
      return false;
    }
  }

  // REMOVED: extractAndProcessSpeech and resetVADState - handled by new VAD system

  /**
   * Stop recording
   */
  public async stopRecording(expectedTurnId?: string): Promise<Blob | null> {
    if (expectedTurnId && this.currentTurnId !== expectedTurnId) {
      return null;
    }
    if (!this.isRecording || !this.rollingBufferVAD) {
      return null;
    }

    try {
      // Stop VAD and get audio blob (VAD now auto-cleans MediaRecorder)
      const audioBlob = await this.rollingBufferVAD.stop();
      
      // VAD is now self-cleaning - just null the reference
      this.rollingBufferVAD = null;

      this.isRecording = false;
      this.audioLevel = 0;
      this.currentTurnId = null;

      this.notifyListeners();

      // Call completion callback
      if (audioBlob && this.options.onRecordingComplete) {
        this.options.onRecordingComplete(audioBlob);
      }

      return audioBlob;
    } catch (error) {
      console.error('[ConversationMic] Stop recording failed:', error);
      return null;
    }
  }

  /**
   * Mute microphone during TTS playback
   */
  mute(): void {
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    }
    this.isPaused = true;
    audioArbitrator.setMicrophoneState('muted');
    this.notifyListeners();
  }

  /**
   * Unmute microphone after TTS playback - ATOMIC: Clean then unmute
   */
  unmute(): void {
    // CRITICAL: Clean media source BEFORE unmuting to prevent race conditions
    this.forceCleanup();
    console.log('[ConversationMic] 🧹 Media source cleaned before unmute');
    
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
    }
    this.isPaused = false;
    
    // Request audio control again if we don't have it
    if (audioArbitrator.getCurrentSystem() === 'none') {
      audioArbitrator.requestControl('microphone');
    }
    
    audioArbitrator.setMicrophoneState('active');
    this.notifyListeners();
  }

  /**
   * Get current analyser for audio level detection
   */
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      audioLevel: this.audioLevel
    };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Cancel recording
   */
  cancelRecording(): void {
    this.forceCleanup();
  }

  /**
   * Cleanup everything - CACHE-FREE: Complete cleanup of all resources
   */
  forceCleanup(): void {
    console.log('[ConversationMic] 🧹 CACHE-FREE: Complete cleanup of all resources');
    
    this.isRecording = false;
    this.audioLevel = 0;
    this.currentTurnId = null;

    if (this.rollingBufferVAD) {
      this.rollingBufferVAD.stop().catch(() => {});
      this.rollingBufferVAD.cleanup();
      this.rollingBufferVAD = null;
    }
    
    // Clean up MediaRecorder
    this.mediaRecorder = null;

    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    audioArbitrator.releaseControl('microphone');
    audioArbitrator.setMicrophoneState('inactive');
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance for conversation domain
export const conversationMicrophoneService = new ConversationMicrophoneServiceClass();