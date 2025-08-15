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
}

class ConversationMicrophoneServiceClass {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  
  private options: ConversationMicrophoneOptions = {};
  private listeners = new Set<() => void>();

  /**
   * INITIALIZE - Set up service with options
   */
  initialize(options: ConversationMicrophoneOptions): void {
    console.log('[ConversationMic] 🔧 Initializing service');
    this.options = options;
  }

  /**
   * START RECORDING - Complete domain-specific recording
   */
  async startRecording(): Promise<boolean> {
    // Check permission from arbitrator
    if (!microphoneArbitrator.claim('conversation')) {
      console.error('[ConversationMic] ❌ Cannot start - microphone in use by another domain');
      if (this.options.onError) {
        this.options.onError(new Error('Microphone is busy with another feature'));
      }
      return false;
    }

    try {
      console.log('[ConversationMic] 🎤 Starting conversation recording');
      
      // Create our own stream - no sharing
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        } 
      });

      // Set up MediaRecorder for conversation
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });

      this.audioChunks = [];
      this.isRecording = true;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.handleRecordingComplete();
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('[ConversationMic] ❌ MediaRecorder error:', event);
        if (this.options.onError) {
          this.options.onError(new Error('Recording failed'));
        }
        this.cleanup();
      };

      this.mediaRecorder.start();
      
      this.notifyListeners();
      console.log('[ConversationMic] ✅ Recording started successfully');
      return true;

    } catch (error) {
      console.error('[ConversationMic] ❌ Failed to start recording:', error);
      microphoneArbitrator.release('conversation');
      
      if (this.options.onError) {
        this.options.onError(error instanceof Error ? error : new Error('Recording failed'));
      }
      
      return false;
    }
  }

  /**
   * STOP RECORDING - Clean domain-specific stop
   */
  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.isRecording || !this.mediaRecorder) {
        reject(new Error('No active recording to stop'));
        return;
      }

      console.log('[ConversationMic] 🛑 Stopping conversation recording');
      
      this.isRecording = false;

      // Set up one-time handler for stop completion
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        console.log('[ConversationMic] 📼 Recording completed - blob size:', audioBlob.size);
        
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('[ConversationMic] ❌ Stop recording error:', event);
        this.cleanup();
        reject(new Error('Failed to stop recording'));
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * CANCEL RECORDING - Cancel without processing
   */
  cancelRecording(): void {
    if (!this.isRecording) return;

    console.log('[ConversationMic] ❌ Cancelling conversation recording');
    
    this.isRecording = false;
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    this.cleanup();
  }

  /**
   * HANDLE RECORDING COMPLETE - Process finished recording
   */
  private handleRecordingComplete(): void {
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    console.log('[ConversationMic] 📼 Recording completed - blob size:', audioBlob.size);
    
    if (this.options.onRecordingComplete) {
      this.options.onRecordingComplete(audioBlob);
    }
    
    this.cleanup();
  }

  /**
   * CLEANUP - Complete domain cleanup
   */
  private cleanup(): void {
    console.log('[ConversationMic] 🧹 Cleaning up conversation microphone');

    // Stop stream tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        console.log('[ConversationMic] Stopping track:', track.kind);
        track.stop();
      });
      this.stream = null;
    }

    // Clear refs
    this.mediaRecorder = null;
    this.audioChunks = [];

    // Release arbitrator
    microphoneArbitrator.release('conversation');
    
    this.notifyListeners();
  }

  /**
   * GET STATE - For React hooks
   */
  getState() {
    return {
      isRecording: this.isRecording,
      hasStream: !!this.stream
    };
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
    console.log('[ConversationMic] 🚨 Force cleanup');
    this.isRecording = false;
    this.cleanup();
  }
}

// Singleton instance for conversation domain
export const conversationMicrophoneService = new ConversationMicrophoneServiceClass();
