/**
 * 📝 JOURNAL MICROPHONE SERVICE - Complete Domain Isolation
 * 
 * Handles ALL microphone functionality for journal/form voice input.
 * Completely isolated from other domains.
 */

import { supabase } from '@/integrations/supabase/client';
import { microphoneArbitrator } from './MicrophoneArbitrator';

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
    console.log('[JournalMic] 🔧 Initializing service');
    this.options = options;
  }

  /**
   * START RECORDING - Complete domain-specific recording
   */
  async startRecording(): Promise<boolean> {
    // Check permission from arbitrator
    if (!microphoneArbitrator.claim('journal')) {
      console.error('[JournalMic] ❌ Cannot start - microphone in use by another domain');
      return false;
    }

    try {
      console.log('[JournalMic] 🎤 Starting journal voice recording');
      
      // Create our own stream - no sharing
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        }
      });

      // Set up audio analysis
      this.audioContext = new AudioContext({ sampleRate: 48000 });
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.mediaStreamSource.connect(this.analyser);

      // Set up MediaRecorder
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
        this.processAudio();
      };

      this.mediaRecorder.start(1000); // 1-second chunks for better WebM structure
      
      // Start silence monitoring
      this.startSilenceMonitoring();
      
      this.notifyListeners();
      console.log('[JournalMic] ✅ Recording started successfully');
      return true;

    } catch (error) {
      console.error('[JournalMic] ❌ Failed to start recording:', error);
      microphoneArbitrator.release('journal');
      return false;
    }
  }

  /**
   * STOP RECORDING - Clean domain-specific stop
   */
  stopRecording(): void {
    if (!this.isRecording) return;

    console.log('[JournalMic] 🛑 Stopping journal voice recording');
    
    this.isRecording = false;
    this.monitoringRef.current = false;
    
    // Clear silence timer
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
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
    const timeoutMs = this.options.silenceTimeoutMs || 3000;

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
          console.log(`[JournalMic] ⏰ ${timeoutMs}ms silence detected - stopping`);
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
      
      console.log('[JournalMic] 🔄 Processing journal audio...');
      
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
      
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];
          
          const { data, error } = await supabase.functions.invoke('google-speech-to-text', {
            body: {
              audioData: base64Audio,
                                             config: {
           encoding: 'WEBM_OPUS',
           languageCode: 'en-US',
           enableAutomaticPunctuation: true,
           model: 'latest_short'
         }
            }
          });

          if (error) throw error;
          
          const transcript = data?.transcript || '';
          console.log('[JournalMic] 📝 Transcript:', transcript);
          
          if (this.options.onTranscriptReady && transcript) {
            this.options.onTranscriptReady(transcript);
          }
          
        } catch (error) {
          console.error('[JournalMic] ❌ Transcription failed:', error);
        } finally {
          this.isProcessing = false;
          this.notifyListeners();
        }
      };
      
      reader.readAsDataURL(audioBlob);
      
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
    console.log('[JournalMic] 🧹 Cleaning up journal microphone');

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
    microphoneArbitrator.release('journal');
    
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
    console.log('[JournalMic] 🚨 Force cleanup');
    this.isRecording = false;
    this.isProcessing = false;
    this.monitoringRef.current = false;
    this.cleanup();
  }
}

// Singleton instance for journal domain
export const journalMicrophoneService = new JournalMicrophoneServiceClass();
