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
  private isRecording = false;
  private isPaused = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private audioLevel = 0;
  private currentTurnId: string | null = null;
  private options: ConversationMicrophoneOptions = {};
  private listeners = new Set<() => void>();
  private cleanupTimeout: NodeJS.Timeout | null = null;
  private isCleaningUp = false;
  
  // AUTOMATED LIFECYCLE: Self-managing state
  private streamHealthCheckInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private autoRecoveryEnabled = true;
  private lastActivityTime = 0;
  private streamEndedHandler: (() => void) | null = null;

  constructor(options: ConversationMicrophoneOptions = {}) {
    this.options = options;
    
    // DEFENSIVE: Handle browser edge cases
    this.setupDefensiveCleanup();
  }

  /**
   * DEFENSIVE: Setup cleanup for browser edge cases
   */
  private setupDefensiveCleanup(): void {
    // Handle browser tab close/refresh
    const handleBeforeUnload = () => {
      console.log('[ConversationMic] 🛡️ DEFENSIVE: Browser closing, forcing cleanup');
      this.forceCleanup();
    };

    // Handle page visibility change (tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden && this.isRecording) {
        console.log('[ConversationMic] 🛡️ DEFENSIVE: Tab hidden during recording, forcing cleanup');
        this.forceCleanup();
      }
    };

    // Handle online/offline changes
    const handleOnlineChange = () => {
      if (!navigator.onLine && this.isRecording) {
        console.log('[ConversationMic] 🛡️ DEFENSIVE: Network offline during recording, forcing cleanup');
        this.forceCleanup();
      }
    };

    // Add event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('online', handleOnlineChange);
      window.addEventListener('offline', handleOnlineChange);
    }
  }

  /**
   * Initialize service with options - AUTOMATED LIFECYCLE
   */
  initialize(options: ConversationMicrophoneOptions): void {
    this.options = { ...this.options, ...options };
    this.isInitialized = true;
    
    // AUTOMATED: Start stream health monitoring
    this.startStreamHealthMonitoring();
    
    console.log('[ConversationMic] 🤖 AUTOMATED: Service initialized with self-managing lifecycle');
  }

  /**
   * AUTOMATED: Start stream health monitoring
   */
  private startStreamHealthMonitoring(): void {
    if (this.streamHealthCheckInterval) {
      clearInterval(this.streamHealthCheckInterval);
    }
    
    this.streamHealthCheckInterval = setInterval(() => {
      this.checkStreamHealth();
    }, 2000); // Check every 2 seconds
  }

  /**
   * AUTOMATED: Check stream health and auto-recover
   */
  private checkStreamHealth(): void {
    if (!this.isInitialized || !this.autoRecoveryEnabled) return;
    
    // Check if stream is still active
    if (this.stream) {
      const audioTracks = this.stream.getAudioTracks();
      const hasActiveTrack = audioTracks.some(track => track.readyState === 'live');
      
      if (!hasActiveTrack && this.isRecording) {
        console.log('[ConversationMic] 🤖 AUTOMATED: Stream died, auto-recovering...');
        this.autoRecoverStream();
      }
    }
    
    // Check for stale recording (no activity for 30 seconds)
    const now = Date.now();
    if (this.isRecording && (now - this.lastActivityTime) > 30000) {
      console.log('[ConversationMic] 🤖 AUTOMATED: Stale recording detected, auto-stopping...');
      this.autoStopRecording();
    }
  }

  /**
   * AUTOMATED: Auto-recover from stream failure
   */
  private async autoRecoverStream(): Promise<void> {
    if (!this.autoRecoveryEnabled) return;
    
    try {
      console.log('[ConversationMic] 🤖 AUTOMATED: Attempting stream recovery...');
      
      // Clean up current stream
      this.performCleanup();
      
      // Wait a moment for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try to restart recording
      const success = await this.startRecording();
      if (success) {
        console.log('[ConversationMic] 🤖 AUTOMATED: Stream recovery successful');
      } else {
        console.log('[ConversationMic] 🤖 AUTOMATED: Stream recovery failed, will retry later');
      }
    } catch (error) {
      console.error('[ConversationMic] 🤖 AUTOMATED: Stream recovery error:', error);
    }
  }

  /**
   * AUTOMATED: Auto-stop stale recording
   */
  private async autoStopRecording(): Promise<void> {
    if (!this.isRecording) return;
    
    try {
      console.log('[ConversationMic] 🤖 AUTOMATED: Auto-stopping stale recording...');
      const audioBlob = await this.stopRecording();
      
      if (audioBlob && this.options.onRecordingComplete) {
        this.options.onRecordingComplete(audioBlob);
      }
    } catch (error) {
      console.error('[ConversationMic] 🤖 AUTOMATED: Auto-stop error:', error);
    }
  }

  /**
   * AUTOMATED: Setup stream event handlers for automatic cleanup
   */
  private setupStreamEventHandlers(): void {
    if (!this.stream) return;
    
    // Remove existing handler if any
    if (this.streamEndedHandler) {
      this.stream.removeEventListener('ended', this.streamEndedHandler);
    }
    
    // Create new handler
    this.streamEndedHandler = () => {
      console.log('[ConversationMic] 🤖 AUTOMATED: Stream ended event detected, auto-cleaning...');
      this.performCleanup();
    };
    
    // Add event listener
    this.stream.addEventListener('ended', this.streamEndedHandler);
    
    // AUTOMATED: Update activity time when stream is active
    this.lastActivityTime = Date.now();
    
    console.log('[ConversationMic] 🤖 AUTOMATED: Stream event handlers configured');
  }


  /**
   * Start recording
   */
  public async startRecording(): Promise<boolean> {
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
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,        // CRITICAL: Must match opus codec requirements
          channelCount: 1,          // CRITICAL: Mono for STT efficiency
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
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

      // AUTOMATED: Setup stream event handlers for automatic cleanup
      this.setupStreamEventHandlers();

      // Create fresh AudioContext for each turn to prevent stale data
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(() => {});
      }
      this.audioContext = new AudioContext({ sampleRate: 48000 });

      // Create audio analysis chain
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.8;
      this.mediaStreamSource.connect(this.analyser);

      // Create VAD
      this.rollingBufferVAD = new RollingBufferVAD({
        lookbackWindowMs: 750,
        chunkDurationMs: 250,
        voiceThreshold: 0.012,
        silenceThreshold: 0.008,
        voiceConfirmMs: 300,
        silenceTimeoutMs: this.options.silenceTimeoutMs || 1500,
        onVoiceStart: () => {
          // Voice detected
        },
        onSilenceDetected: () => {
          if (this.currentTurnId === turnId) {
            this.stopRecording(turnId);
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
      this.lastActivityTime = Date.now(); // AUTOMATED: Track activity

      // Start VAD
      await this.rollingBufferVAD.start(this.stream, this.audioContext, this.analyser);

      this.notifyListeners();
      return true;

    } catch (error) {
      console.error('[ConversationMic] Recording setup failed:', error);
      this.audioLevel = 0;
      
      // DEFENSIVE: Cleanup on error to prevent cached data
      this.performCleanup();
      
      if (this.options.onError) {
        this.options.onError(error);
      }
      return false;
    }
  }

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
      // Stop VAD and get audio blob
      const audioBlob = await this.rollingBufferVAD.stop();
      
      // Clean up VAD after getting the blob to prevent race conditions
      if (this.rollingBufferVAD) {
        this.rollingBufferVAD.cleanup();
        this.rollingBufferVAD = null;
      }

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
      
      // DEFENSIVE: Cleanup on error to prevent cached data
      this.performCleanup();
      
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
   * Unmute microphone after TTS playback
   */
  unmute(): void {
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
      audioLevel: this.audioLevel,
      hasStream: !!this.stream,
      hasAnalyser: !!this.analyser
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
    if (this.isCleaningUp) {
      console.log('[ConversationMic] 🚫 Cleanup already in progress, skipping');
      return;
    }
    
    this.isCleaningUp = true;
    console.log('[ConversationMic] 🧹 CACHE-FREE: Complete cleanup of all resources');
    
    // AUTOMATED: Stop health monitoring
    if (this.streamHealthCheckInterval) {
      clearInterval(this.streamHealthCheckInterval);
      this.streamHealthCheckInterval = null;
    }
    
    // Clear any pending cleanup timeout
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
    
    this.isRecording = false;
    this.audioLevel = 0;
    this.currentTurnId = null;

    // DEFENSIVE: Multiple cleanup attempts to handle edge cases
    this.performCleanup();
    
    // DEFENSIVE: Set timeout to ensure cleanup completes even if errors occur
    this.cleanupTimeout = setTimeout(() => {
      console.log('[ConversationMic] 🛡️ DEFENSIVE: Forcing final cleanup after timeout');
      this.performCleanup();
      this.isCleaningUp = false;
    }, 1000);

    audioArbitrator.releaseControl('microphone');
    audioArbitrator.setMicrophoneState('inactive');
    this.notifyListeners();
  }

  /**
   * DEFENSIVE: Perform actual cleanup with error handling
   */
  private performCleanup(): void {
    try {
      if (this.rollingBufferVAD) {
        this.rollingBufferVAD.stop().catch(() => {});
        this.rollingBufferVAD.cleanup(); // This now completely destroys MediaRecorder
        this.rollingBufferVAD = null;
      }
    } catch (error) {
      console.error('[ConversationMic] Error cleaning up VAD:', error);
    }

    try {
      if (this.stream) {
        // AUTOMATED: Remove stream event handler
        if (this.streamEndedHandler) {
          this.stream.removeEventListener('ended', this.streamEndedHandler);
          this.streamEndedHandler = null;
        }
        
        this.stream.getAudioTracks().forEach(track => {
          try {
            track.stop();
          } catch (error) {
            console.error('[ConversationMic] Error stopping track:', error);
          }
        });
        this.stream = null;
      }
    } catch (error) {
      console.error('[ConversationMic] Error cleaning up stream:', error);
    }

    try {
      if (this.mediaStreamSource) {
        this.mediaStreamSource.disconnect();
        this.mediaStreamSource = null;
      }
    } catch (error) {
      console.error('[ConversationMic] Error cleaning up mediaStreamSource:', error);
    }

    try {
      if (this.analyser) {
        this.analyser.disconnect();
        this.analyser = null;
      }
    } catch (error) {
      console.error('[ConversationMic] Error cleaning up analyser:', error);
    }

    try {
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close().catch(() => {});
        this.audioContext = null;
      }
    } catch (error) {
      console.error('[ConversationMic] Error cleaning up audioContext:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance for conversation domain
export const conversationMicrophoneService = new ConversationMicrophoneServiceClass();