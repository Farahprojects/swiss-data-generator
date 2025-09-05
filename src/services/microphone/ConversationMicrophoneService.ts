/**
 * 🎙️ CONVERSATION MICROPHONE SERVICE - Orchestrator Pattern
 * 
 * Orchestrates conversation recording using global audio capture and stateless VAD.
 * No longer owns audio resources - just coordinates them.
 */

import { microphoneArbitrator } from './MicrophoneArbitrator';
import { AudioCaptureManager } from '../voice/AudioCaptureManager';
import { StatelessVADProcessor } from './vad/StatelessVADProcessor';
import { RollingBufferRecorder } from './vad/RollingBufferRecorder';

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
  private audioCaptureManager: AudioCaptureManager;
  private vadProcessor: StatelessVADProcessor;
  private rollingBufferRecorder: RollingBufferRecorder;
  private isRecording = false;
  private isStartingRecording = false;
  private isPaused = false;
  private audioLevel = 0;
  private monitoringRef = { current: false };
  
  private options: ConversationMicrophoneOptions = {};
  private listeners = new Set<() => void>();

  constructor(options: ConversationMicrophoneOptions = {}) {
    this.options = options;
    this.audioCaptureManager = AudioCaptureManager.getInstance();
    
    // Create stateless VAD processor
    this.vadProcessor = new StatelessVADProcessor({
      voiceThreshold: 0.012,
      silenceThreshold: 0.008,
      voiceConfirmMs: 300,
      silenceTimeoutMs: options.silenceTimeoutMs || 1500
    }, {
      onVoiceStart: () => {
        this.log('🎤 VAD: Voice activity confirmed');
        this.rollingBufferRecorder.startActiveRecording();
      },
      onSilenceDetected: () => {
        this.log('🧘‍♂️ VAD: Silence detected - stopping recording');
        this.isRecording = false;
        this.handleRecordingComplete();
      }
    });

    // Create rolling buffer recorder
    this.rollingBufferRecorder = new RollingBufferRecorder({
      lookbackWindowMs: 750,
      chunkDurationMs: 250
    });
  }

  /**
   * INITIALIZE - Set up service with options
   */
  initialize(options: ConversationMicrophoneOptions): void {
    this.log('🔧 Initializing service');
    this.options = options;
  }


  /**
   * START RECORDING - Orchestrate recording using global audio capture
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
    
    try {
      this.log('🎤 Starting conversation recording');
      
      // Initialize global audio capture if needed
      const captureState = this.audioCaptureManager.getState();
      if (!captureState.isActive) {
        await this.audioCaptureManager.initialize();
      }

      const stream = this.audioCaptureManager.getStream();
      const analyser = this.audioCaptureManager.getAnalyser();
      
      if (!stream || !analyser) {
        this.error('❌ Global audio capture not available');
        return false;
      }

      // Reset VAD processor for new turn
      this.vadProcessor.reset();

      // Start rolling buffer recorder
      await this.rollingBufferRecorder.start(stream);

      // Start VAD monitoring
      this.startVADMonitoring(analyser);

      this.isRecording = true;
      this.notifyListeners();
      this.log('🎙️ Recording started successfully');
      
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
   * START VAD MONITORING - Monitor audio levels and feed to stateless VAD
   */
  private startVADMonitoring(analyser: AnalyserNode): void {
    if (this.monitoringRef.current) {
      return;
    }
    
    this.monitoringRef.current = true;
    this.log('✅ VAD monitoring started');

    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    
    let lastSampleTime = 0;
    const targetIntervalMs = 33; // ~30 fps sampling
    
    const checkVAD = () => {
      if (!this.monitoringRef.current || !this.isRecording) {
        return;
      }
      
      // Throttle sampling for performance
      const nowHr = performance.now();
      if (nowHr - lastSampleTime < targetIntervalMs) {
        if (this.monitoringRef.current) requestAnimationFrame(checkVAD);
        return;
      }
      lastSampleTime = nowHr;

      // Calculate RMS audio level
      analyser.getByteTimeDomainData(dataArray);
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        const centered = (dataArray[i] - 128) / 128;
        sumSquares += centered * centered;
      }
      const rms = Math.sqrt(sumSquares / bufferLength);
      this.audioLevel = rms;
      
      // Feed to stateless VAD processor
      this.vadProcessor.processFrame(rms);

      if (this.monitoringRef.current) {
        requestAnimationFrame(checkVAD);
      }
    };

    checkVAD();
  }

  /**
   * STOP RECORDING - Stop recording and get final blob
   */
  async stopRecording(): Promise<Blob | null> {
    if (!this.isRecording) {
      this.log('❌ Cannot stop - not recording');
      return null;
    }

    this.log('🛑 Stopping conversation recording');
    this.isRecording = false;

    // Stop VAD monitoring
    this.monitoringRef.current = false;

    // Stop rolling buffer recorder and get final blob
    const blob = await this.rollingBufferRecorder.stop();
    
    if (blob) {
      this.log(`✅ Recording complete: ${blob.size} bytes`);
    } else {
      this.log('⚠️ No audio collected');
    }
    
    // Reset VAD processor for next turn
    this.vadProcessor.reset();
    
    // Notify listeners after isRecording becomes false
    this.notifyListeners();
    
    return blob;
  }

  /**
   * CANCEL RECORDING - Cancel without processing
   */
  cancelRecording(): void {
    if (!this.isRecording) return;

    this.log('❌ Cancelling conversation recording');
    
    this.isRecording = false;
    this.monitoringRef.current = false;
    
    // Stop rolling buffer recorder
    this.rollingBufferRecorder.stop();
    
    // Reset VAD processor
    this.vadProcessor.reset();
    
    this.notifyListeners();
  }

  /**
   * GET CURRENT AUDIO LEVEL - For VAD feedback
   */
  getCurrentAudioLevel(): number {
    return this.audioLevel;
  }

  /**
   * HANDLE RECORDING COMPLETE - Process finished recording
   */
  private async handleRecordingComplete(): Promise<void> {
    // Guard against duplicate callbacks
    if (this.isRecording) {
      this.log('🎤 Recording complete callback called but still recording, stopping first');
      this.isRecording = false; // Mark as not recording before callback
    }
    
    // Stop VAD monitoring
    this.monitoringRef.current = false;
    
    let finalBlob: Blob | null = null;
    
    // Stop rolling buffer recorder and get final blob
    finalBlob = await this.rollingBufferRecorder.stop();
    
    if (finalBlob && this.options.onRecordingComplete) {
      this.options.onRecordingComplete(finalBlob);
    }
    
    // Reset VAD processor for next turn
    this.vadProcessor.reset();
    
    this.log('🎤 Recording complete - ready for next turn');
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
    this.monitoringRef.current = false;
    
    // Stop recording if active
    if (this.isRecording) {
      this.isRecording = false;
    }

    // Reset VAD processor
    this.vadProcessor.reset();

    // Stop rolling buffer recorder
    this.rollingBufferRecorder.stop();
    
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
      hasStream: !!this.audioCaptureManager.getStream(),
      audioLevel: this.audioLevel,
      isPaused: this.isPaused
    };
  }

  /**
   * GET STREAM - For external access (if needed)
   */
  getStream(): MediaStream | null {
    return this.audioCaptureManager.getStream();
  }

  /**
   * GET ANALYSER - For external audio level analysis (read-only)
   */
  getAnalyser(): AnalyserNode | null {
    return this.audioCaptureManager.getAnalyser();
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
    const stream = this.audioCaptureManager.getStream();
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = false;
        this.log('🔇 Disabled audio track for playback');
      });
    }
    
    // Suspend the AudioContext to free up audio resources
    const audioContext = this.audioCaptureManager.getAudioContext();
    if (audioContext && audioContext.state === 'running') {
      audioContext.suspend().then(() => {
        this.log('🔇 AudioContext suspended for playback');
      }).catch((error) => {
        this.error('❌ Failed to suspend AudioContext:', error);
      });
    }

    // Mark paused and notify listeners
    this.isPaused = true;
    this.notifyListeners();
  }

  /**
   * RESUME AFTER PLAYBACK - Re-enable mic after TTS playback
   */
  async resumeAfterPlayback(): Promise<void> {
    this.log('🔊 Resuming microphone after TTS playback');
    
    // Re-enable the microphone track
    const stream = this.audioCaptureManager.getStream();
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = true;
        this.log('🔊 Re-enabled audio track after playback');
      });
    }
    
    // Resume the AudioContext
    const audioContext = this.audioCaptureManager.getAudioContext();
    if (audioContext && audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
        this.log('🔊 AudioContext resumed after playback');
      } catch (error) {
        this.error('❌ Failed to resume AudioContext:', error);
      }
    }

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
    this.monitoringRef.current = false;
    
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