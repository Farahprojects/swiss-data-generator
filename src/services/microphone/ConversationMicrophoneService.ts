/**
 * 🎙️ CONVERSATION MICROPHONE SERVICE - Complete Domain Isolation
 * 
 * Handles ALL microphone functionality for AI conversation recording.
 * Completely isolated from other domains.
 */

import { microphoneArbitrator } from './MicrophoneArbitrator';
import { conversationTtsService } from '@/services/voice/conversationTts'; // Import the central voice service

export interface ConversationMicrophoneOptions {
  onRecordingComplete?: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
  onSilenceDetected?: () => void;
  silenceTimeoutMs?: number;
  silenceThreshold?: number;
  silenceDuration?: number;
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
  private silenceStartTime: number | null = null;
  private vadRafId: number | NodeJS.Timeout | null = null;
  
  private options: ConversationMicrophoneOptions = {
    silenceThreshold: 0.01,
    silenceDuration: 2000
  };
  private listeners = new Set<() => void>();

  /**
   * INITIALIZE - Set up service with options
   */
  initialize(options: ConversationMicrophoneOptions): void {
    this.log('🔧 Initializing service');
    this.options = { ...this.options, ...options };
  }

  /**
   * START RECORDING - Complete domain-specific recording
   */
  async startRecording(): Promise<boolean> {
    this.log('🎤 Starting conversation recording');
    
    // Claim the arbitrator first
    if (!microphoneArbitrator.claim('conversation')) {
      this.error('❌ Cannot start - microphone in use by another domain');
      if (this.options.onError) {
        this.options.onError(new Error('Microphone is in use'));
      }
      return false;
    }
    
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
    this.log('✅ Got cached mic stream from voice session');

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
    this.log('✅ Got shared AudioContext from voice session, state:', this.audioContext.state);

    try {
      // Defensively resume AudioContext if suspended (helps on iOS)
      if (this.audioContext.state === 'suspended') {
        this.log('🔄 AudioContext suspended, resuming...');
        await this.audioContext.resume();
        this.log('✅ AudioContext resumed, new state:', this.audioContext.state);
      }
      
      this.log('🔧 Creating MediaStreamSource...');
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
      this.log('✅ MediaStreamSource created');
      
      this.log('🔧 Creating AnalyserNode...');
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.log('✅ AnalyserNode created and configured');
      
      this.log('🔧 Connecting audio nodes...');
      this.mediaStreamSource.connect(this.analyser);
      this.log('✅ Audio nodes connected');
      
      this.log('🔧 Setting up MediaRecorder...');
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      this.log('✅ MediaRecorder created');
      
      this.log('🔧 Setting up MediaRecorder event handlers...');
      this.mediaRecorder.ondataavailable = (event) => {
        this.log('📦 MediaRecorder data available, size:', event.data.size);
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.log('🛑 MediaRecorder stopped, processing audio...');
        this.handleRecordingComplete();
      };
      this.log('✅ MediaRecorder event handlers set up');
      
      this.log('🔧 Starting MediaRecorder...');
      this.mediaRecorder.start(100); // 100ms chunks
      this.log('✅ MediaRecorder started');
      
      this.log('🔧 Starting voice activity detection...');
      this.startVoiceActivityDetection();
      this.log('✅ Voice activity detection started');
      
      this.isRecording = true;
      this.notifyListeners();
      this.log('✅ Recording started successfully using shared session stream');
      return true;

    } catch (error) {
      this.error('❌ Failed to start recording:', error);
      // Release arbitrator claim on failure
      microphoneArbitrator.release('conversation');
      if (this.options.onError) {
        this.options.onError(error instanceof Error ? error : new Error('Recording failed'));
      }
      
      return false;
    }
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

  // ----- Non-Blocking Voice Activity Detection (VAD) -----
  private startVoiceActivityDetection(): void {
    this.log('🎯 Starting VAD loop (non-blocking)...');
    
    const checkVAD = () => {
      if (!this.isRecording || !this.analyser) {
        this.log('🛑 VAD loop stopping - not recording or no analyser');
        return;
      }

      try {
        // Get audio data (simplified analysis)
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        
        // Simplified RMS calculation (sample every 4th value to reduce computation)
        let sum = 0;
        let count = 0;
        for (let i = 0; i < dataArray.length; i += 4) {
          sum += dataArray[i] * dataArray[i];
          count++;
        }
        const rms = Math.sqrt(sum / count);
        const level = Math.min(rms / 128, 1); // Normalize to 0-1
        
        // Update audio level
        this.audioLevel = level;
        
        // Check for silence
        const isSilent = level < this.options.silenceThreshold;
        const now = Date.now();
        
        if (isSilent) {
          if (!this.silenceStartTime) {
            this.silenceStartTime = now;
            this.log('🔇 Silence detected, starting timer...');
          } else if (now - this.silenceStartTime > this.options.silenceDuration) {
            this.log('⏰ Silence duration exceeded, triggering onSilenceDetected');
            this.silenceStartTime = null;
            if (this.options.onSilenceDetected) {
              this.options.onSilenceDetected();
            }
            return; // Stop the loop
          }
        } else {
          if (this.silenceStartTime) {
            this.log('🔊 Audio detected, resetting silence timer');
            this.silenceStartTime = null;
          }
        }
        
        // Continue the loop with setTimeout (yields control to browser)
        this.vadRafId = setTimeout(checkVAD, 100); // 100ms instead of 16ms
        
      } catch (error) {
        this.error('❌ Error in VAD loop:', error);
        // Stop the loop on error
        return;
      }
    };
    
    this.log('🚀 Starting first VAD frame (100ms intervals)...');
    this.vadRafId = setTimeout(checkVAD, 100);
  }

  /**
   * Stop voice activity detection
   */
  private stopVoiceActivityDetection(): void {
    this.log('🛑 Stopping VAD loop...');
    if (this.vadRafId) {
      clearTimeout(this.vadRafId); // Changed from cancelAnimationFrame to clearTimeout
      this.vadRafId = null;
      this.log('✅ VAD loop stopped');
    }
  }

  /**
   * Handle recording completion
   */
  private handleRecordingComplete(): void {
    this.log('🎬 Handling recording completion...');
    
    if (this.audioChunks.length === 0) {
      this.log('⚠️ No audio chunks recorded');
      this.cleanup();
      return;
    }

    this.log('🔧 Creating audio blob from', this.audioChunks.length, 'chunks...');
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    this.log('✅ Audio blob created, size:', audioBlob.size);
    
    this.audioChunks = [];
    
    if (this.options.onRecordingComplete) {
      this.log('📞 Calling onRecordingComplete callback...');
      this.options.onRecordingComplete(audioBlob);
    }
  }

  /**
   * Stop recording and process the audio
   */
  stopRecording(): Promise<Blob | null> {
    this.log('🛑 Stop recording called...');
    
    if (!this.isRecording || !this.mediaRecorder) {
      this.log('⚠️ Not recording or no MediaRecorder');
      return Promise.resolve(null);
    }

    this.log('🔧 Stopping MediaRecorder...');
    this.mediaRecorder.stop();
    this.log('✅ MediaRecorder stop() called');
    
    this.isRecording = false;
    this.stopVoiceActivityDetection();
    
    this.log('✅ Recording stopped successfully');
    
    // Return the audio blob from handleRecordingComplete
    return new Promise((resolve) => {
      // Override the onRecordingComplete callback temporarily
      const originalCallback = this.options.onRecordingComplete;
      this.options.onRecordingComplete = (blob: Blob) => {
        resolve(blob);
        // Restore original callback
        this.options.onRecordingComplete = originalCallback;
      };
    });
  }

  /**
   * Cancel recording without processing
   */
  cancelRecording(): void {
    this.log('❌ Cancelling recording...');
    
    if (!this.isRecording) {
      this.log('⚠️ Not recording, nothing to cancel');
      return;
    }

    this.isRecording = false;
    this.stopVoiceActivityDetection();
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.log('🔧 Stopping MediaRecorder...');
      this.mediaRecorder.stop();
    }
    
    this.cleanup();
    this.log('✅ Recording cancelled');
  }

  /**
   * Clean up resources (called on cancel/reset/overlay close)
   */
  private cleanup(): void {
    this.log('🧹 Cleaning up conversation microphone');

    // Stop VAD first
    this.stopVoiceActivityDetection();

    // Do NOT stop the shared stream tracks here. The session manager owns the stream.
    // We only disconnect our local nodes.
    if (this.mediaStreamSource) {
      this.log('🔌 Disconnecting MediaStreamSource...');
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
      this.log('✅ MediaStreamSource disconnected');
    }

    if (this.analyser) {
      this.log('🔌 Disconnecting AnalyserNode...');
      this.analyser.disconnect();
      this.analyser = null;
      this.log('✅ AnalyserNode disconnected');
    }
    
    // Do NOT close the shared AudioContext. The session manager owns it.
    this.audioContext = null;

    // Clear local refs
    this.mediaRecorder = null;
    this.analyser = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.silenceStartTime = null;
    this.audioLevel = 0;

    // Release microphone from arbitrator
    this.log('🔓 Releasing microphone from arbitrator...');
    microphoneArbitrator.release('conversation');
    this.log('✅ Microphone released from arbitrator');
    
    this.log('✅ Cleanup completed');
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