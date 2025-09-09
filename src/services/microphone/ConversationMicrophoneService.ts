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

  /**
   * Get consistent MediaRecorder options across the service
   */
  private getMediaRecorderOptions(): MediaRecorderOptions {
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const mrOptions: MediaRecorderOptions = {};
    
    if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
      if (isChrome) {
        // Chrome: Use MP3 format (no header fragmentation issues)
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mrOptions.mimeType = 'audio/mp4';
          mrOptions.audioBitsPerSecond = 128000;
        }
      } else {
        // Safari/Others: Use WebM format
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mrOptions.mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mrOptions.mimeType = 'audio/webm';
        }
      }
    }
    
    return mrOptions;
  }

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
    
    // SESSION-BASED: Only clean if we don't have a stream (first turn)
    if (!this.stream) {
      this.forceCleanup();
      // Media source cleaned before start (first turn)
    } else {
      // Reusing existing MediaStream for turn
    }
    
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
      // SESSION-BASED: Create MediaStream only if we don't have one (first turn)
      if (!this.stream) {
        // Creating MediaStream for session (first turn)
        
        // Detect Chrome and log Chrome mode
        const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        if (isChrome) {
          // Chrome detected
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

        // Create AudioContext for session
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
        
        // ALWAYS create NEW MediaRecorder (fixes Invalid format errors)
        this.mediaRecorder = new MediaRecorder(this.stream, this.getMediaRecorderOptions());
      } else {
        console.log('[ConversationMic] ♻️ Reusing existing MediaStream for turn:', turnId);
        // ALWAYS create NEW MediaRecorder even when reusing stream (fixes Invalid format)
        this.mediaRecorder = new MediaRecorder(this.stream, this.getMediaRecorderOptions());
      }

      // Enable debug logging for Chrome investigation
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('debugAudio', '1');
      }

      // Create VAD
      this.rollingBufferVAD = new RollingBufferVAD({
        lookbackWindowMs: 15000,
        chunkDurationMs: 300,
        preRollMs: 250,
        pruneOnUtterance: true,
        voiceThreshold: 0.005, // More sensitive for speech start
        silenceThreshold: 0.001, // More sensitive for silence detection
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
   * Mute microphone during TTS playback - use pauseListening for better performance
   */
  mute(): void {
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    }
    this.pauseListening();
    audioArbitrator.setMicrophoneState('muted');
    this.notifyListeners();
  }

  /**
   * Unmute microphone after TTS playback - use resumeListening for better performance
   */
  unmute(): void {
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
    }
    
    // Resume listening using existing stream/AudioContext
    this.resumeListening();
    
    // Request audio control again if we don't have it
    if (audioArbitrator.getCurrentSystem() === 'none') {
      audioArbitrator.requestControl('microphone');
    }
    
    audioArbitrator.setMicrophoneState('active');
    this.notifyListeners();
  }

  /**
   * Pause listening - stop VAD/MediaRecorder but keep stream and AudioContext alive
   */
  pauseListening(): void {
    if (this.rollingBufferVAD) {
      this.rollingBufferVAD.stop();
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    
    this.isRecording = false;
    this.isPaused = true;
    console.log('[ConversationMic] ⏸️ Paused listening (stream/AudioContext kept alive)');
  }

  /**
   * Resume listening - create new MediaRecorder on existing stream and restart VAD
   */
  resumeListening(): void {
    if (!this.stream || !this.audioContext) {
      console.warn('[ConversationMic] Cannot resume - no stream or AudioContext');
      return;
    }

    // Create new MediaRecorder on existing stream (use consistent options)
    this.mediaRecorder = new MediaRecorder(this.stream, this.getMediaRecorderOptions());

    // Restart VAD with existing stream and AudioContext
    if (this.rollingBufferVAD) {
      this.rollingBufferVAD.start(this.stream, this.mediaRecorder, this.audioContext);
    }

    this.isRecording = true;
    this.isPaused = false;
    console.log('[ConversationMic] ▶️ Resumed listening (reused stream/AudioContext)');
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
   * Graceful release - Release resources without aggressive cleanup
   */
  forceCleanup(): void {
    // Graceful release of resources (fire-and-forget to prevent hanging)
    
    this.isRecording = false;
    this.audioLevel = 0;
    this.currentTurnId = null;

    // Fire-and-forget VAD cleanup
    if (this.rollingBufferVAD) {
      this.rollingBufferVAD.stop().catch(() => {});
      this.rollingBufferVAD.cleanup();
      this.rollingBufferVAD = null;
    }
    
    // Release MediaRecorder (don't force cleanup)
    this.mediaRecorder = null;

    // Release microphone browser resources (fire-and-forget)
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          // Ignore track stop errors
        }
      });
      this.stream = null;
    }

    // Release media source (fire-and-forget)
    if (this.mediaStreamSource) {
      try {
        this.mediaStreamSource.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      this.mediaStreamSource = null;
    }

    // Release analyser (fire-and-forget)
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      this.analyser = null;
    }

    // Release AudioContext (fire-and-forget)
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    // Release audio control (fire-and-forget)
    try {
      audioArbitrator.releaseControl('microphone');
      audioArbitrator.setMicrophoneState('inactive');
    } catch (e) {
      // Ignore arbitrator errors
    }
    
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance for conversation domain
export const conversationMicrophoneService = new ConversationMicrophoneServiceClass();