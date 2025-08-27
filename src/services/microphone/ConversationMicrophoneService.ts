/**
 * 🎙️ CONVERSATION MICROPHONE SERVICE - Complete Domain Isolation
 * 
 * Handles ALL microphone functionality for AI conversation recording.
 * Completely isolated from other domains.
 */

import { microphoneArbitrator } from './MicrophoneArbitrator';

export interface ConversationMicrophoneOptions {
  onRecordingComplete?: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
  onSilenceDetected?: () => void;
  silenceTimeoutMs?: number;
}

export class ConversationMicrophoneServiceClass {
  private stream: MediaStream | null = null;
  private cachedStream: MediaStream | null = null; // NEW: Cached stream for session reuse
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = []; // Simple chunk collection
  private isRecording = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private monitoringRef = { current: false };
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
    try {
      this.log('🎤 Starting conversation recording');
      
      // SINGLE-GESTURE FLOW: Use cached stream if available, otherwise fallback
      if (this.cachedStream) {
        this.log('🎤 Using cached microphone stream (no getUserMedia call)');
        this.stream = this.cachedStream;
      } else {
        // Fallback: Create new stream (shouldn't happen in single-gesture flow)
        this.log('⚠️ No cached stream - falling back to getUserMedia (shouldn\'t happen)');
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
          }
        });
      }

      // Log stream details for debugging
      const track = this.stream.getAudioTracks()[0];
      const trackSettings = track.getSettings();
      
      // SINGLE-GESTURE FLOW: Reuse AudioContext if it exists, otherwise create new
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioContext({ sampleRate: 48000 });
        this.log('🎛️ Created new AudioContext');
      } else {
        this.log('🎛️ Reusing existing AudioContext');
      }
      
      // Defensively resume AudioContext if suspended (helps on iOS)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // SINGLE-GESTURE FLOW: Reuse analyser if it exists, otherwise create new
      if (!this.analyser) {
        this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;
        this.mediaStreamSource.connect(this.analyser);
        this.log('🎛️ Created new analyser and media stream source');
      } else {
        this.log('🎛️ Reusing existing analyser');
      }

      // SINGLE-GESTURE FLOW: Always create new MediaRecorder to avoid state conflicts
      if (this.mediaRecorder) {
        // Ensure previous recorder is fully stopped
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
        this.mediaRecorder = null;
      }
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });
      this.log('🎛️ Created fresh MediaRecorder to avoid state conflicts');

      this.audioChunks = [];
      this.isRecording = true;

      // Simple chunk collection - no manipulation
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.handleRecordingComplete();
      };

      this.mediaRecorder.onerror = (event) => {
        this.error('❌ MediaRecorder error:', event);
        if (this.options.onError) {
          this.options.onError(new Error('Recording failed'));
        }
        this.cleanup();
      };

      // Start recording and VAD
      this.mediaRecorder.start(100); // 100ms chunks
      this.startVoiceActivityDetection();
      
      this.notifyListeners();
      this.log('🎙️ Recording started successfully');
      return true;

    } catch (error: any) {
      console.error('Recording setup error:', error.name, error);
      this.error('❌ Recording setup failed:', error);
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
    if (!this.isRecording || !this.mediaRecorder) {
      this.log('❌ Cannot stop - not recording');
      return null;
    }

    this.log('🛑 Stopping conversation recording');
    this.isRecording = false;

    return new Promise((resolve) => {
      // Store the original onstop handler
      const originalOnStop = this.mediaRecorder.onstop;
      
      // Set up the data handler before stopping
      this.mediaRecorder.onstop = () => {
        this.log('📦 MediaRecorder stopped, creating blob...');
        
        if (this.audioChunks.length === 0) {
          this.log('⚠️ No audio chunks collected');
          resolve(null);
          return;
        }

        const blob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
        this.log(`✅ Recording complete: ${blob.size} bytes`);
        
        // Clear chunks for next recording
        this.audioChunks = [];
        
        // IMPORTANT: Do NOT call cleanup here - keep stream and analyser alive
        // Cleanup should only be called on cancel/reset/overlay close
        this.log('🎤 Stream and analyser kept alive for next turn');
        
        // Call the original handler (which calls onRecordingComplete)
        if (originalOnStop) {
          originalOnStop.call(this.mediaRecorder);
        }
        
        resolve(blob);
      };

      // Stop the recorder
      this.mediaRecorder.stop();
    });
  }

  /**
   * CANCEL RECORDING - Cancel without processing
   */
  cancelRecording(): void {
    if (!this.isRecording) return;

    this.log('❌ Cancelling conversation recording');
    
    this.isRecording = false;
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    this.cleanup();
  }

  /**
   * CREATE FINAL BLOB FROM BUFFER - Build final audio with retroactive trimming
   */
  private createFinalBlobFromBuffer(): Blob {
    if (this.audioChunks.length === 0) {
      this.log('⚠️ No audio chunks - returning empty blob');
      return new Blob([], { type: 'audio/webm' });
    }

    // Simple, professional approach - let MediaRecorder handle the format
    const finalBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
    this.log(`📼 Clean audio blob created: ${finalBlob.size} bytes from ${this.audioChunks.length} chunks`);
    
    return finalBlob;
  }

  /**
   * HANDLE RECORDING COMPLETE - Process finished recording
   */
  private handleRecordingComplete(): void {
    const finalBlob = this.createFinalBlobFromBuffer();
    
    if (this.options.onRecordingComplete) {
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
    
    // Stop recording if active
    if (this.isRecording && this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.isRecording = false;
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

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Clear data
    this.audioChunks = [];
    this.mediaRecorder = null;
    
    // Release microphone from arbitrator
    microphoneArbitrator.release('conversation');
    
    this.log('✅ Conversation microphone service cleaned up');
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

  // Get current audio level for UI feedback
  getCurrentAudioLevel(): number {
    return this.audioLevel;
  }

  /**
   * GET STREAM - For external access (if needed)
   */
  getStream(): MediaStream | null {
    return this.stream;
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
  }

  /**
   * FORCE CLEANUP - Emergency cleanup
   */
  forceCleanup(): void {
    this.log('🚨 Force cleanup');
    this.isRecording = false;
    this.cleanup();
  }

  // ----- Two-Phase Voice Activity Detection (VAD) -----
  private startVoiceActivityDetection(): void {
    this.log('🧠 VAD start requested - checking conditions...');
    this.log(`🧠 analyser exists: ${!!this.analyser}, monitoring already active: ${this.monitoringRef.current}`);
    
    if (!this.analyser || this.monitoringRef.current) {
      this.log('❌ VAD start blocked - analyser missing or already monitoring');
      return;
    }
    
    this.monitoringRef.current = true;
    this.log('✅ VAD monitoring started successfully');

    const bufferLength = this.analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    
    // VAD State Machine
    let phase: 'waiting_for_voice' | 'monitoring_silence' = 'waiting_for_voice';
    let voiceStartTime: number | null = null;
    let silenceStartTime: number | null = null;
    
    // Optimized thresholds for natural conversation flow
    const VOICE_START_THRESHOLD = 0.012;  // RMS threshold to detect voice start
    const VOICE_START_DURATION = 300;     // Duration to confirm voice (300ms)
    const SILENCE_THRESHOLD = 0.008;      // Lower threshold for silence (hysteresis)
    const SILENCE_TIMEOUT = this.options.silenceTimeoutMs || 2000; // 2 seconds for natural pauses
    
    this.log(`🧠 VAD started - waiting for voice (>${VOICE_START_THRESHOLD} RMS for ${VOICE_START_DURATION}ms, silence <${SILENCE_THRESHOLD} RMS for ${SILENCE_TIMEOUT}ms)`);

    const checkVAD = () => {
      // CRITICAL: Check monitoring state first to prevent infinite recursion
      if (!this.monitoringRef.current || !this.analyser) {
        this.log(`🛑 VAD loop terminated (monitoring: ${this.monitoringRef.current}, analyser: ${!!this.analyser})`);
        return;
      }
      
      // ✅ WAKE UP CALL: Ensure AudioContext is running before analysis
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          this.log('✅ AudioContext resumed successfully after being suspended.');
        });
      }
      
      // Get current RMS audio level
      this.analyser.getByteTimeDomainData(dataArray);
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        const centered = (dataArray[i] - 128) / 128;
        sumSquares += centered * centered;
      }
      const rms = Math.sqrt(sumSquares / bufferLength);
      this.audioLevel = rms;
      
      // Convert to dB for debugging
      const dB = rms > 0 ? 20 * Math.log10(rms) : -100;
      
      const now = Date.now();
      
      if (phase === 'waiting_for_voice') {
        // Phase 1: Wait for real voice activity
        if (rms > VOICE_START_THRESHOLD) {
          if (voiceStartTime === null) {
            voiceStartTime = now;
          } else if (now - voiceStartTime >= VOICE_START_DURATION) {
            // Voice confirmed! Switch to silence monitoring
            phase = 'monitoring_silence';
            voiceStartTime = null;
            this.log(`🎤 Voice activity confirmed (RMS: ${rms.toFixed(4)}, dB: ${dB.toFixed(1)}) - now monitoring for ${SILENCE_TIMEOUT}ms silence`);
          }
        } else {
          voiceStartTime = null; // Reset if signal drops
        }
        
      } else if (phase === 'monitoring_silence') {
        // Phase 2: Monitor for silence after voice detected
        if (rms < SILENCE_THRESHOLD) {
          if (silenceStartTime === null) {
            silenceStartTime = now;
          } else if (now - silenceStartTime >= SILENCE_TIMEOUT) {
            // Natural silence detected - stop recording
            this.log(`🧘‍♂️ ${SILENCE_TIMEOUT}ms silence detected after voice - stopping naturally (RMS: ${rms.toFixed(4)}, dB: ${dB.toFixed(1)})`);
            this.monitoringRef.current = false;
            // ✅ FIXED: Actually stop the recording to trigger audio processing
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
              this.mediaRecorder.stop();
            }
            this.log(`🛑 VAD loop terminated after silence detection`);
            return; // CRITICAL: Don't schedule next frame after silence detected
          }
        } else {
          silenceStartTime = null; // Reset silence timer - still speaking
        }
      }

      // Only continue the loop if we're still monitoring
      if (this.monitoringRef.current) {
        requestAnimationFrame(checkVAD);
      } else {
        this.log(`🛑 VAD loop terminated (monitoring flag changed during execution)`);
      }
    };

    checkVAD();
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