/**
 * 🎙️ CONVERSATION MICROPHONE SERVICE - Complete Domain Isolation
 * 
 * Handles ALL microphone functionality for AI conversation recording.
 * Completely isolated from other domains.
 */

import { microphoneArbitrator } from './MicrophoneArbitrator';
import { conversationTtsService } from '../voice/conversationTts'; // Import the central voice service

export interface ConversationMicrophoneOptions {
  onRecordingComplete?: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
  onSilenceDetected?: () => void;
  silenceTimeoutMs?: number;
}

class ConversationMicrophoneServiceClass {
  private stream: MediaStream | null = null;
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

  /**
   * INITIALIZE - Set up service with options
   */
  initialize(options: ConversationMicrophoneOptions): void {
    this.log('🔧 Initializing service');
    this.options = options;
  }

  /**
   * START RECORDING - Complete domain-specific recording
   */
  async startRecording(): Promise<boolean> {
    this.log('🎤 Starting conversation recording');
    
    // Use the single, persistent MediaStream from the voice session
    const stream = conversationTtsService.getCachedMicStream();
    if (!stream) {
      this.error('❌ Cannot start recording: No cached mic stream found in the voice session.');
      if (this.options.onError) {
        this.options.onError(new Error('Microphone stream not available.'));
      }
      return false;
    }
    this.stream = stream;

    // Use the single, shared AudioContext from the voice session
    const audioContext = conversationTtsService.getSharedAudioContext();
    if (!audioContext) {
      this.error('❌ Cannot start recording: No shared AudioContext found in the voice session.');
      if (this.options.onError) {
        this.options.onError(new Error('AudioContext not available.'));
      }
      return false;
    }
    this.audioContext = audioContext;

    try {
      // Defensively resume AudioContext if suspended (helps on iOS)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.mediaStreamSource.connect(this.analyser);

      // Set up MediaRecorder - simple and clean
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

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
      this.log('✅ Recording started successfully using shared session stream');
      return true;

    } catch (error) {
      this.error('❌ Failed to start recording:', error);
      if (this.options.onError) {
        this.options.onError(error instanceof Error ? error : new Error('Recording failed'));
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
  private cleanup(): void {
    this.log('🧹 Cleaning up conversation microphone');

    // Do NOT stop the shared stream tracks here. The session manager owns the stream.
    // We only disconnect our local nodes.
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    // Do NOT close the shared AudioContext. The session manager owns it.
    this.audioContext = null;

    // Clear local refs
    this.mediaRecorder = null;
    this.analyser = null;

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
   * FORCE CLEANUP - Emergency cleanup
   */
  forceCleanup(): void {
    this.log('🚨 Force cleanup');
    this.isRecording = false;
    this.cleanup();
  }

  // ----- Two-Phase Voice Activity Detection (VAD) -----
  private startVoiceActivityDetection(): void {
    if (!this.analyser || this.monitoringRef.current) return;
    this.monitoringRef.current = true;

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
            if (this.options.onSilenceDetected) {
              this.options.onSilenceDetected();
            }
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