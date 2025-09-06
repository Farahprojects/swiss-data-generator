/**
 * 📝 JOURNAL MICROPHONE SERVICE - Complete Domain Isolation
 * 
 * Handles ALL microphone functionality for journal/form voice input.
 * Completely isolated from other domains.
 */

import { supabase } from '@/integrations/supabase/client';
import { audioArbitrator } from '@/services/audio/AudioArbitrator';

export interface JournalMicrophoneOptions {
  onTranscriptReady?: (transcript: string) => void;
  onSilenceDetected?: () => void;
  silenceTimeoutMs?: number;
}

class JournalMicrophoneServiceClass {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private isProcessing = false;
  private audioLevel = 0;
  private silenceTimer: NodeJS.Timeout | null = null;
  private monitoringRef = { current: false };
  
  private options: JournalMicrophoneOptions = {};
  private listeners = new Set<() => void>();

  /**
   * INITIALIZE - Set up service with options
   */
  initialize(options: JournalMicrophoneOptions): void {
    this.options = options;
  }

  /**
   * START RECORDING - Complete domain-specific recording
   */
  async startRecording(): Promise<boolean> {
    // Check permission from arbitrator
    if (!audioArbitrator.requestControl('microphone')) {
      console.error('[JournalMic] ❌ Cannot start - microphone in use by another domain');
      return false;
    }

    try {
      // CHROME COMPATIBILITY: Chrome is picky about constraints
      const chromeAudioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: { ideal: 48000 }, // Chrome prefers 48kHz
        channelCount: { ideal: 1 }    // Mono for STT
      };
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: chromeAudioConstraints
      });

      // Set up audio analysis
      this.audioContext = new AudioContext(); // Mobile-friendly: Let browser choose sample rate
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.mediaStreamSource.connect(this.analyser);

      // CHROME COMPATIBILITY: Explicit MIME type is critical
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'  // Chrome's preferred format
      });

      this.audioChunks = [];
      this.isRecording = true;

      // CHROME DEBUG: Log everything for validation
      this.mediaRecorder.ondataavailable = (event) => {
        console.log('🔍 Chrome chunk - size:', event.data.size, 'type:', event.data.type, 'timestamp:', Date.now());
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        console.log('🔍 Chrome recording stopped, ready for new session');
        this.processAudio();
      };

      // CHROME COMPATIBILITY: 100ms chunks for reliable timing
      this.mediaRecorder.start(100);
      
      // Start silence monitoring
      this.startSilenceMonitoring();
      
      this.notifyListeners();
      return true;

    } catch (error) {
      console.error('[JournalMic] ❌ Failed to start recording:', error);
      audioArbitrator.releaseControl('microphone');
      return false;
    }
  }

  /**
   * STOP RECORDING - Clean domain-specific stop
   */
  stopRecording(): void {
    if (!this.isRecording) return;

    this.isRecording = false;
    this.monitoringRef.current = false;
    
    // Clear silence timer
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    // CHROME COMPATIBILITY: Clean start/stop cycles
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // CHROME COMPATIBILITY: Remove event listeners after stop
    if (this.mediaRecorder) {
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.onerror = null;
    }

    this.cleanup();
  }

  /**
   * SILENCE MONITORING - Domain-specific silence detection
   */
  private startSilenceMonitoring(): void {
    if (!this.analyser || this.monitoringRef.current) return;

    this.monitoringRef.current = true;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let silenceStart: number | null = null;
    const silenceThreshold = 8;
    const timeoutMs = this.options.silenceTimeoutMs || 1500;

    const checkSilence = () => {
      if (!this.monitoringRef.current || !this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Calculate RMS (audio level)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      this.audioLevel = rms;

      const now = Date.now();

      if (rms < silenceThreshold) {
        if (silenceStart === null) {
          silenceStart = now;
        } else if (now - silenceStart >= timeoutMs) {
          this.monitoringRef.current = false;
          
          if (this.options.onSilenceDetected) {
            this.options.onSilenceDetected();
          }
          
          this.stopRecording();
          return;
        }
      } else {
        silenceStart = null;
      }

      requestAnimationFrame(checkSilence);
    };

    checkSilence();
  }

  /**
   * PROCESS AUDIO - Domain-specific transcription
   */
  private async processAudio(): Promise<void> {
    if (this.audioChunks.length === 0) return;

    try {
      this.isProcessing = true;
      this.notifyListeners();
      
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      
      const { data, error } = await supabase.functions.invoke('openai-whisper', {
        body: audioBlob,
        headers: {
          'X-Meta': JSON.stringify({
            config: {
              mimeType: 'audio/webm',
              languageCode: 'en'
            }
          })
        }
      });

      if (error) throw error;
      
      const transcript = data?.transcript || '';
      
      if (this.options.onTranscriptReady && transcript) {
        this.options.onTranscriptReady(transcript);
      }
      
    } catch (error) {
      console.error('[JournalMic] ❌ Audio processing failed:', error);
      this.isProcessing = false;
      this.notifyListeners();
    }
  }

  /**
   * CLEANUP - Complete domain cleanup
   */
  private cleanup(): void {
    // Disconnect audio nodes
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    // Close AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Stop stream tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Clear refs
    this.mediaRecorder = null;
    this.analyser = null;
    this.audioChunks = [];
    this.audioLevel = 0;

    // Release arbitrator
    audioArbitrator.releaseControl('microphone');
    
    this.notifyListeners();
  }

  /**
   * GET STATE - For React hooks
   */
  getState() {
    return {
      isRecording: this.isRecording,
      isProcessing: this.isProcessing,
      audioLevel: this.audioLevel
    };
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
    this.isRecording = false;
    this.isProcessing = false;
    this.monitoringRef.current = false;
    this.cleanup();
  }
}

// Singleton instance for journal domain
export const journalMicrophoneService = new JournalMicrophoneServiceClass();
