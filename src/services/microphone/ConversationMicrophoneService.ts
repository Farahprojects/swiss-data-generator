/**
 * 🎙️ CONVERSATION MICROPHONE SERVICE - Streamlined Version
 * 
 * Handles microphone functionality for AI conversation recording.
 * Simplified to essential functionality only.
 */

import { audioArbitrator } from '@/services/audio/AudioArbitrator';
import { WebWorkerVAD } from './vad/WebWorkerVAD';

export interface ConversationMicrophoneOptions {
  onRecordingComplete?: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
  onSilenceDetected?: () => void;
  silenceTimeoutMs?: number;
}

export class ConversationMicrophoneServiceClass {
  private cachedStream: MediaStream | null = null;
  private webWorkerVAD: WebWorkerVAD | null = null;
  private isRecording = false;
  private audioLevel = 0;
  private currentTurnId: string | null = null;
  private options: ConversationMicrophoneOptions = {};
  private listeners = new Set<() => void>();

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
   * Cache microphone stream for session reuse
   */
  public cacheStream(stream: MediaStream): void {
    this.cachedStream = stream;
  }

  /**
   * Start recording - Creates continuous VAD that runs for entire conversation
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

    // Ensure tracks are enabled
    if (this.cachedStream) {
      this.cachedStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
    }

    try {
      // Validate cached stream
      if (!this.cachedStream || this.cachedStream.getAudioTracks().length === 0) {
        console.error('[ConversationMic] No cached stream available');
        return false;
      }

      const audioTrack = this.cachedStream.getAudioTracks()[0];
      if (audioTrack.readyState !== 'live') {
        console.error('[ConversationMic] Audio track not ready:', audioTrack.readyState);
        return false;
      }

      // Create continuous VAD if not already created
      if (!this.webWorkerVAD) {
        this.webWorkerVAD = new WebWorkerVAD({
          voiceThreshold: 0.01,
          silenceThreshold: 0.005,
          silenceTimeoutMs: this.options.silenceTimeoutMs || 1500,
          bufferWindowMs: 200,
          sampleRate: 16000, // Lower sample rate for VAD analysis
          onVoiceStart: () => {
            // Voice detected - start recording this turn
            this.isRecording = true;
            this.notifyListeners();
          },
          onSilenceDetected: () => {
            // Silence detected - stop recording this turn
            if (this.currentTurnId === turnId) {
              this.stopRecording(turnId);
            }
          },
          onAudioLevel: (level: number) => {
            this.audioLevel = level;
          },
          onError: (error: Error) => {
            console.error('[ConversationMic] VAD error:', error);
            if (this.options.onError) {
              this.options.onError(error);
            }
          }
        });

        // Start continuous VAD
        await this.webWorkerVAD.start(this.cachedStream);
      }

      audioArbitrator.setMicrophoneState('active');
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

  /**
   * Stop recording - VAD continues running for next turn
   */
  public async stopRecording(expectedTurnId?: string): Promise<Blob | null> {
    if (expectedTurnId && this.currentTurnId !== expectedTurnId) {
      return null;
    }
    if (!this.isRecording || !this.webWorkerVAD) {
      return null;
    }

    try {
      // Get audio blob from VAD (VAD continues running)
      const audioBlob = await this.webWorkerVAD.stop();
      
      // Reset recording state but keep VAD running
      this.isRecording = false;
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
   * Mute microphone during TTS playback - VAD naturally gets silence
   */
  mute(): void {
    if (this.cachedStream) {
      this.cachedStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    }
    audioArbitrator.setMicrophoneState('muted');
    this.notifyListeners();
  }

  /**
   * Unmute microphone after TTS playback - VAD naturally gets voice again
   */
  unmute(): void {
    if (this.cachedStream) {
      this.cachedStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
    }
    
    // Request audio control again if we don't have it
    if (audioArbitrator.getCurrentSystem() === 'none') {
      audioArbitrator.requestControl('microphone');
    }
    
    audioArbitrator.setMicrophoneState('active');
    this.notifyListeners();
  }


  /**
   * Get current state
   */
  getState() {
    return {
      isRecording: this.isRecording,
      audioLevel: this.audioLevel,
      hasStream: !!this.cachedStream,
      hasVAD: !!this.webWorkerVAD
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
   * Cleanup everything
   */
  forceCleanup(): void {
    this.isRecording = false;
    this.audioLevel = 0;

    if (this.webWorkerVAD) {
      this.webWorkerVAD.cleanup();
      this.webWorkerVAD = null;
    }

    if (this.cachedStream) {
      this.cachedStream.getAudioTracks().forEach(track => track.stop());
      this.cachedStream = null;
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