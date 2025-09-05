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
  private isPaused = false; // NEW: Explicit pause flag during TTS playback
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private audioLevel = 0;
  
  // 🔥 FIX: Turn tracking to prevent stale VAD callbacks
  private currentTurnId: string | null = null;
  private isStopping = false; // Prevent double processing during stop
  
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
      
      // 🔥 FIX: Reuse existing AudioContext to keep browser microphone alive
      // Only create new AudioContext if none exists or it's closed
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioContext({ sampleRate: 16000 });
        this.log('🔥 [CONVERSATION-TURN] Created new AudioContext');
      } else {
        this.log('🔥 [CONVERSATION-TURN] Reusing existing AudioContext');
      }
      
      // Create fresh MediaStream by cloning the audio track for this turn
      const originalTrack = this.cachedStream.getAudioTracks()[0];
      const clonedTrack = originalTrack.clone();
      this.stream = new MediaStream([clonedTrack]);
      
      this.log('🔥 [CONVERSATION-TURN] Created fresh MediaStream with cloned audio track');
      
      // Create fresh audio analysis chain using existing AudioContext
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      // Mobile-first: Optimized settings for faster processing
      this.analyser.fftSize = 1024; // Mobile-first: Smaller FFT for faster analysis
      this.analyser.smoothingTimeConstant = 0.8;
      this.mediaStreamSource.connect(this.analyser);
      
      this.log('🔥 [CONVERSATION-TURN] Fresh audio analysis chain created with existing AudioContext');

      // 🔥 FIX: Generate turn ID to prevent stale callbacks
      this.currentTurnId = crypto.randomUUID();
      this.isStopping = false;
      const turnId = this.currentTurnId;
      this.log(`🔥 [CONVERSATION-TURN] Starting turn ${turnId}`);

      // Initialize rolling buffer VAD with turn-aware callbacks
      this.rollingBufferVAD = new RollingBufferVAD({
        lookbackWindowMs: 750,
        chunkDurationMs: 250,
        voiceThreshold: 0.012,
        silenceThreshold: 0.008,
        voiceConfirmMs: 300,
        silenceTimeoutMs: this.options.silenceTimeoutMs || 1500,
        onVoiceStart: () => {
          // Only log if this is still the current turn
          if (this.currentTurnId === turnId) {
            this.log(`🎤 Rolling buffer VAD [${turnId}]: Voice activity confirmed`);
          }
        },
        onSilenceDetected: () => {
          // 🔥 FIX: Only process if this is still the current turn and not already stopping
          if (this.currentTurnId === turnId && !this.isStopping) {
            this.log(`🧘‍♂️ Rolling buffer VAD [${turnId}]: Silence detected - unified stop`);
            this.unifiedStopRecording(turnId);
          } else {
            this.log(`🧘‍♂️ Rolling buffer VAD [${turnId}]: Silence detected but ignoring (stale callback)`);
          }
        },
        onError: (error: Error) => {
          this.error(`❌ Rolling buffer VAD [${turnId}] error:`, error);
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
   * 🔥 UNIFIED STOP RECORDING - Single path for all stop scenarios
   */
  private async unifiedStopRecording(expectedTurnId: string): Promise<Blob | null> {
    // Guard against stale calls or already stopping
    if (this.currentTurnId !== expectedTurnId || this.isStopping) {
      this.log(`🛡️ Ignoring stale stop call for turn ${expectedTurnId} (current: ${this.currentTurnId}, stopping: ${this.isStopping})`);
      return null;
    }

    if (!this.isRecording || !this.rollingBufferVAD) {
      this.log('❌ Cannot stop - not recording');
      return null;
    }

    this.log(`🛑 [UNIFIED-STOP] Stopping turn ${expectedTurnId}`);
    this.isStopping = true; // Prevent duplicate processing
    this.isRecording = false;

    // Stop rolling buffer VAD and get final blob
    const blob = await this.rollingBufferVAD.stop();
    
    // ✅ SAFE CLEANUP: VAD.stop() has completed and called cleanup() internally
    // Now it's safe to set the reference to null immediately
    this.rollingBufferVAD = null;
    
    if (blob) {
      this.log(`✅ Recording complete: ${blob.size} bytes`);
      
      // Call the recording complete callback (mimics chat-bar flow)
      if (this.options.onRecordingComplete) {
        this.options.onRecordingComplete(blob);
      }
    } else {
      this.log('⚠️ No audio collected');
    }
    
    // Clean up capture chain after each turn (VAD already cleaned up)
    this.teardownCaptureChain();
    
    // Notify listeners after isRecording becomes false
    this.notifyListeners();
    
    return blob;
  }

  /**
   * STOP RECORDING - Public interface (now delegates to unified path)
   */
  async stopRecording(): Promise<Blob | null> {
    if (!this.currentTurnId) {
      this.log('❌ No active turn to stop');
      return null;
    }
    
    return this.unifiedStopRecording(this.currentTurnId);
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
    
    // Only teardown capture chain, don't do full cleanup
    this.teardownCaptureChain();
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
   * 🔥 TEARDOWN CAPTURE CHAIN - Shared cleanup logic
   */
  private teardownCaptureChain(): void {
    this.log('🔥 [TEARDOWN] Cleaning up capture chain for fresh next turn');
    
    // VAD reference is already set to null in the calling method after stop() completes
    // No need to set it to null here

    // Disconnect audio analysis nodes
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    // Stop current cloned stream tracks but keep cachedStream for next turn
    if (this.stream && this.stream !== this.cachedStream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Reset turn tracking
    this.currentTurnId = null;
    this.isStopping = false;

    this.log('🔥 [TEARDOWN] Capture chain cleaned, ready for fresh start');
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

    // VAD is self-cleaning - no need to call cleanup() here
    // The VAD.stop() method already calls cleanup() internally
    if (this.rollingBufferVAD) {
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
      audioLevel: this.audioLevel,
      isPaused: this.isPaused
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
   * SUSPEND FOR PLAYBACK - Stop mic stream during TTS playback
   */
  suspendForPlayback(): void {
    this.log('🔇 Suspending microphone for TTS playback');
    
    // ✅ PROPER PAUSE: Stop the VAD first to prevent processing muted frames
    if (this.rollingBufferVAD) {
      this.rollingBufferVAD.stop().catch(() => {
        // Ignore errors during pause - VAD will be restarted on resume
      });
      this.rollingBufferVAD = null;
      this.log('🔇 VAD stopped for TTS playback');
    }
    
    // ✅ PROPER PAUSE: Stop the microphone stream completely
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.stop(); // Stop the track completely, don't just disable
        this.log('🔇 Stopped audio track for playback');
      });
      this.stream = null;
    }
    
    // ✅ PROPER PAUSE: Close AudioContext to free up all audio resources
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().then(() => {
        this.log('🔇 AudioContext closed for playback');
      }).catch((error) => {
        this.error('❌ Failed to close AudioContext:', error);
      });
      this.audioContext = null;
    }

    // Mark paused and notify listeners
    this.isPaused = true;
    this.notifyListeners();
  }

  /**
   * RESUME AFTER PLAYBACK - Restart mic stream after TTS playback
   */
  async resumeAfterPlayback(): Promise<void> {
    this.log('🔊 Resuming microphone after TTS playback');
    
    // ✅ PROPER RESUME: Recreate the microphone stream from cached stream
    if (this.cachedStream) {
      // Clone a fresh audio track from the cached stream
      const originalTrack = this.cachedStream.getAudioTracks()[0];
      const clonedTrack = originalTrack.clone();
      this.stream = new MediaStream([clonedTrack]);
      this.log('🔊 Recreated microphone stream from cached stream');
    } else {
      this.error('❌ No cached stream available for resume');
      return;
    }
    
    // ✅ PROPER RESUME: Create fresh AudioContext and analysis chain
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.8;
    this.mediaStreamSource.connect(this.analyser);
    this.log('🔊 Recreated audio analysis chain');

    // Clear paused state and notify listeners
    this.isPaused = false;
    this.notifyListeners();
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
    
    // Only teardown capture chain, don't do full cleanup
    this.teardownCaptureChain();
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