/**
 * 🎙️ CONVERSATION MICROPHONE SERVICE - Complete Domain Isolation
 * 
 * Handles ALL microphone functionality for AI conversation recording.
 * Completely isolated from other domains.
 */

import { microphoneArbitrator } from './MicrophoneArbitrator';
import { RollingBufferVAD, RollingBufferVADOptions } from './vad/RollingBufferVAD';

export interface ConversationMicrophoneOptions {
  onRecordingComplete?: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
  onSilenceDetected?: () => void;
  silenceTimeoutMs?: number;
}

// 🎵 UTILITY: Safely close AudioContext with proper state checking
const safelyCloseAudioContext = (audioContext: AudioContext | null): void => {
  if (audioContext && audioContext.state !== 'closed') {
    try {
      audioContext.close();
    } catch (error) {
      console.log('[ConversationMicrophoneService] AudioContext already closed, skipping');
    }
  }
};

export class ConversationMicrophoneServiceClass {
  private stream: MediaStream | null = null;
  private cachedStream: MediaStream | null = null; // NEW: Cached stream for session reuse
  private rollingBufferVAD: RollingBufferVAD | null = null;
  private isRecording = false;
  private isStartingRecording = false; // NEW: Guard against concurrent recording starts
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private audioLevel = 0;
  
  private options: ConversationMicrophoneOptions = {};
  private listeners = new Set<() => void>();

  constructor(options: ConversationMicrophoneOptions = {}) {
    this.options = options;
  }

  /**
   * INITIALIZE - Set up service with options
   */
  initialize(options: ConversationMicrophoneOptions): void {
    this.log('🔧 Initializing service');
    this.options = options;
  }

  /**
   * CACHE STREAM - Store microphone stream for session reuse
   */
  public cacheStream(stream: MediaStream): void {
    this.log('🎤 Caching microphone stream for session reuse');
    this.cachedStream = stream;
    this.stream = stream; // Set as current stream
  }

  /**
   * START RECORDING - Complete domain-specific recording
   */
  public async startRecording(): Promise<boolean> {
    this.log('[CONVERSATION-TURN] startRecording called - checking state flags');
    this.log(`[CONVERSATION-TURN] isStartingRecording: ${this.isStartingRecording}, isRecording: ${this.isRecording}`);
    
    // Defensively reset stale state flags
    this.audioLevel = 0;
    
    // 🚫 GUARD: Don't start recording if conversation modal is closed
    try {
      const { useConversationUIStore } = await import('@/features/chat/conversation-ui-store');
      const conversationStore = useConversationUIStore.getState();
      
      if (!conversationStore.isConversationOpen) {
        this.log('🎤 Modal closed, skipping startRecording');
        return false;
      }
    } catch (error) {
      this.log('🎤 Could not check conversation state, proceeding with caution');
    }
    
    // Guard against concurrent recording starts
    if (this.isStartingRecording) {
      this.log('🎤 Recording start already in progress, skipping');
      return false;
    }
    
    if (this.isRecording) {
      this.log('🎤 Already recording, skipping');
      return false;
    }
    
    this.isStartingRecording = true;
    
    // Ensure all tracks are enabled if we have a stream
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = true;
        this.log(`🎤 Ensured track enabled: ${track.kind}, state: ${track.readyState}`);
      });
    }
    
    try {
      this.log('🎤 Starting conversation recording');
      
      // SINGLE-GESTURE FLOW: Use cached stream only
      if (this.cachedStream) {

        this.stream = this.cachedStream;
      } else {
        // No fallback - this should never happen in single-gesture flow
        this.error('❌ No cached stream available - conversation flow broken');
        return false;
      }

      // Ensure the stream is ready and has active tracks
      if (!this.stream || this.stream.getAudioTracks().length === 0) {
        this.error('❌ No audio tracks available in stream');
        return false;
      }

      const audioTrack = this.stream.getAudioTracks()[0];
      if (audioTrack.readyState !== 'live') {
        this.error('❌ Audio track not ready:', audioTrack.readyState);
        return false;
      }

      // Log stream details for debugging
      const track = this.stream.getAudioTracks()[0];
      const trackSettings = track.getSettings();
      
      // 🔥 FIX: Always create fresh AudioContext for each conversation turn
      // This prevents sample rate corruption from suspend/resume cycles during TTS
      if (this.audioContext && this.audioContext.state !== 'closed') {
        // Disconnect existing chain before creating new one
        if (this.mediaStreamSource) {
          this.mediaStreamSource.disconnect();
        }
        await safelyCloseAudioContext(this.audioContext);
        this.log('🔥 [CONVERSATION-TURN] Closed previous AudioContext to prevent corruption');
      }
      
      // Create completely fresh audio analysis chain
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      // Mobile-first: Optimized settings for faster processing
      this.analyser.fftSize = 1024; // Mobile-first: Smaller FFT for faster analysis
      this.analyser.smoothingTimeConstant = 0.8;
      this.mediaStreamSource.connect(this.analyser);
      
      this.log('🔥 [CONVERSATION-TURN] Fresh audio analysis chain created');

      // Initialize rolling buffer VAD
      this.rollingBufferVAD = new RollingBufferVAD({
        lookbackWindowMs: 750,
        chunkDurationMs: 250,
        voiceThreshold: 0.012,
        silenceThreshold: 0.008,
        voiceConfirmMs: 300,
        silenceTimeoutMs: this.options.silenceTimeoutMs || 1500,
        onVoiceStart: () => {
          this.log('🎤 Rolling buffer VAD: Voice activity confirmed');
        },
        onSilenceDetected: () => {
          this.log('🧘‍♂️ Rolling buffer VAD: Silence detected - stopping recording');
          this.isRecording = false;
          this.handleRecordingComplete();
        },
        onError: (error: Error) => {
          this.error('❌ Rolling buffer VAD error:', error);
          if (this.options.onError) {
            this.options.onError(error);
          }
        }
      });

      this.isRecording = true;

      // Start rolling buffer VAD
      await this.rollingBufferVAD.start(this.stream, this.audioContext, this.analyser);
      
      this.notifyListeners();
      this.log('🎙️ Recording started successfully');
      
      
      // 🔥 FIXED: Remove onReady callback to prevent duplicate state setting
      // The TTS onComplete callback will handle state transitions
      
      this.isStartingRecording = false; // Reset guard
      return true;

    } catch (error: any) {
      console.error('Recording setup error:', error.name, error);
      
      this.error('❌ Recording setup failed:', error);
      
      // Reset all state flags on error path
      this.isStartingRecording = false;
      this.audioLevel = 0;
      
      if (this.options.onError) {
        this.options.onError(error);
      }
      return false;
    }
  }

  /**
   * STOP RECORDING - Complete domain-specific recording
   */
  async stopRecording(): Promise<Blob | null> {
    if (!this.isRecording || !this.rollingBufferVAD) {
      this.log('❌ Cannot stop - not recording');
      return null;
    }

    this.log('🛑 Stopping conversation recording');
    this.isRecording = false;

    // Stop rolling buffer VAD and get final blob
    const blob = await this.rollingBufferVAD.stop();
    
    if (blob) {
      this.log(`✅ Recording complete: ${blob.size} bytes`);
    } else {
      this.log('⚠️ No audio collected');
    }
    
    // IMPORTANT: Do NOT call cleanup here - keep stream and analyser alive
    // Cleanup should only be called on cancel/reset/overlay close
    this.log('🎤 Stream and analyser kept alive for next turn');
    
    return blob;
  }

  /**
   * CANCEL RECORDING - Cancel without processing
   */
  cancelRecording(): void {
    if (!this.isRecording) return;

    this.log('❌ Cancelling conversation recording');
    
    this.isRecording = false;
    
    if (this.rollingBufferVAD) {
      this.rollingBufferVAD.stop();
    }
    
    this.cleanup();
  }

  /**
   * GET CURRENT AUDIO LEVEL - For rolling buffer VAD feedback
   */
  getCurrentAudioLevel(): number {
    if (this.rollingBufferVAD) {
      const vadState = this.rollingBufferVAD.getState();
      return vadState.audioLevel;
    }
    return this.audioLevel;
  }

  /**
   * HANDLE RECORDING COMPLETE - Process finished recording
   */
  private async handleRecordingComplete(): Promise<void> {
    // Guard against duplicate callbacks
    if (this.isRecording) {
      this.log('🎤 Recording complete callback called but still recording, stopping VAD first');
      this.isRecording = false; // Mark as not recording before callback
    }
    
    let finalBlob: Blob | null = null;
    
    if (this.rollingBufferVAD) {
      finalBlob = await this.rollingBufferVAD.stop();
    }
    
    if (finalBlob && this.options.onRecordingComplete) {
      this.options.onRecordingComplete(finalBlob);
    }
    
    // IMPORTANT: Do NOT call cleanup here - keep stream and analyser alive
    // Cleanup should only be called on cancel/reset/overlay close
    this.log('🎤 Recording complete - stream and analyser kept alive for next turn');
  }

  /**
   * CLEANUP - Only call this when conversation is completely done
   * (cancel, reset, or overlay close)
   */
  cleanup(): void {
    this.log('🧹 Cleaning up conversation microphone service');
    this.log('[CONVERSATION-TURN] cleanup called - resetting all state flags');
    
    // Reset state flags immediately
    this.isStartingRecording = false;
    this.audioLevel = 0;
    
    // Stop recording if active
    if (this.isRecording) {
      this.isRecording = false;
    }

    // Cleanup rolling buffer VAD
    if (this.rollingBufferVAD) {
      this.rollingBufferVAD.cleanup();
      this.rollingBufferVAD = null;
    }

    // Release microphone stream (both current and cached)
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        this.log(`🎤 Stopped track: ${track.kind}`);
      });
      this.stream = null;
    }

    if (this.cachedStream) {
      this.cachedStream.getTracks().forEach(track => {
        track.stop();
        this.log(`🎤 Stopped cached track: ${track.kind}`);
      });
      this.cachedStream = null;
    }

    // Cleanup audio analysis
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    // 🎵 ELEGANT: Use utility function for safe AudioContext cleanup
    safelyCloseAudioContext(this.audioContext);
    this.audioContext = null;
    
    // Release microphone from arbitrator
    microphoneArbitrator.release('conversation');
    
    this.log('✅ Conversation microphone service cleaned up with state flags reset');
  }

  /**
   * GET STATE - For React hooks
   */
  getState() {
    return {
      isRecording: this.isRecording,
      hasStream: !!this.stream,
      audioLevel: this.audioLevel
    };
  }


  /**
   * GET STREAM - For external access (if needed)
   */
  getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * GET ANALYSER - For external audio level analysis (read-only)
   */
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /**
   * SUBSCRIBE - For React state updates
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * SUSPEND FOR PLAYBACK - Temporarily disable mic for TTS playback
   */
  suspendForPlayback(): void {
    this.log('🔇 Suspending microphone for TTS playback');
    
    // Disable the microphone track without releasing the stream
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = false;
        this.log('🔇 Disabled audio track for playback');
      });
    }
    
    // Suspend the AudioContext to free up audio resources
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend().then(() => {
        this.log('🔇 AudioContext suspended for playback');
      }).catch((error) => {
        this.error('❌ Failed to suspend AudioContext:', error);
      });
    }
  }

  /**
   * RESUME AFTER PLAYBACK - Re-enable mic after TTS playback
   */
  async resumeAfterPlayback(): Promise<void> {
    this.log('🔊 Resuming microphone after TTS playback');
    
    // Re-enable the microphone track
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = true;
        this.log('🔊 Re-enabled audio track after playback');
      });
    }
    
    // Resume the AudioContext
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        this.log('🔊 AudioContext resumed after playback');
      } catch (error) {
        this.error('❌ Failed to resume AudioContext:', error);
      }
    }
    
    // 🔥 FIXED: Remove onReady callback to prevent duplicate state setting
    // The TTS onComplete callback will handle state transitions
  }

  /**
   * FORCE CLEANUP - Emergency cleanup
   */
  forceCleanup(): void {
    this.log('🚨 Force cleanup');
    this.log('[CONVERSATION-TURN] forceCleanup called - resetting all state flags');
    
    // Reset all state flags immediately  
    this.isRecording = false;
    this.isStartingRecording = false;
    this.audioLevel = 0;
    
    this.cleanup();
  }

  // ----- Logging helpers (gated) -----
  private log(message: string, ...args: any[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const enabled = localStorage.getItem('debugAudio') === '1';
        if (!enabled) return;
      }
    } catch (error) {
      // Ignore localStorage errors in SSR environments
    }
    // eslint-disable-next-line no-console
    console.log('[ConversationMic]', message, ...args);
  }

  private error(message: string, ...args: any[]): void {
    // eslint-disable-next-line no-console
    console.error('[ConversationMic]', message, ...args);
  }
}

// Singleton instance for conversation domain
export const conversationMicrophoneService = new ConversationMicrophoneServiceClass();