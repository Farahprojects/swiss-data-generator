// Simple Universal STT Recorder - no chunks, no rolling buffer, just record and stop

export interface STTRecorderOptions {
  onTranscriptReady?: (transcript: string) => void;
  onError?: (error: Error) => void;
  onLevel?: (level: number) => void;
  silenceThreshold?: number;
  silenceDuration?: number;
}

export class UniversalSTTRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrame: number | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private options: STTRecorderOptions;

  constructor(options: STTRecorderOptions = {}) {
    this.options = {
      silenceThreshold: 0.01,
      silenceDuration: 1200, // 1.2 seconds
      ...options
    };
  }

  async start(): Promise<void> {
    if (this.isRecording) return;

    try {
      // Check for secure context (HTTPS)
      if (!window.isSecureContext && location.hostname !== 'localhost') {
        throw new Error('Microphone access requires HTTPS or localhost');
      }

      // Check for getUserMedia support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }

      // Request mic access with optimal settings
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
          sampleRate: 16000, // Optimal for STT
          channelCount: 1,   // Mono for better processing
        }
      });

      console.log('[UniversalSTTRecorder] Microphone access granted');

      // Set up MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: this.getSupportedMimeType()
      });

      this.audioChunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processRecording();
      };

      // Set up silence detection
      this.setupSilenceDetection();

      // Start recording
      this.mediaRecorder.start();
      this.isRecording = true;

    } catch (error) {
      this.options.onError?.(error as Error);
      throw error;
    }
  }

  stop(): void {
    if (!this.isRecording || !this.mediaRecorder) return;

    this.mediaRecorder.stop();
    this.isRecording = false;
    this.cleanup();
  }

  private setupSilenceDetection(): void {
    if (!this.mediaStream) return;

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    
    source.connect(this.analyser);
    this.monitorAudioLevel();
  }

  private monitorAudioLevel(): void {
    if (!this.analyser) return;

    const buffer = new Float32Array(this.analyser.fftSize);
    let lastLevel = 0;
    
    const checkLevel = () => {
      if (!this.isRecording || !this.analyser) return;

      this.analyser.getFloatTimeDomainData(buffer);
      
      // Calculate RMS energy (lightweight)
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
      }
      const rms = Math.sqrt(sum / buffer.length);
      
      // Smooth level changes for UI (prevent jittery animation)
      const rawLevel = Math.min(1, rms * 15); // Boost sensitivity
      const smoothedLevel = lastLevel * 0.7 + rawLevel * 0.3; // Smoothing
      lastLevel = smoothedLevel;

      this.options.onLevel?.(smoothedLevel);

      // Voice Activity Detection (VAD)
      const isSpeaking = smoothedLevel > this.options.silenceThreshold!;
      
      if (!isSpeaking) {
        // Start silence timer
        if (!this.silenceTimer) {
          this.silenceTimer = setTimeout(() => {
            console.log('[UniversalSTTRecorder] Silence detected, stopping recording');
            this.stop();
          }, this.options.silenceDuration);
        }
      } else {
        // Clear silence timer (voice detected)
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
      }

      this.animationFrame = requestAnimationFrame(checkLevel);
    };

    checkLevel();
  }

  private processRecording(): void {
    if (this.audioChunks.length === 0) return;

    // Create single blob from all chunks
    const audioBlob = new Blob(this.audioChunks, { type: this.getSupportedMimeType() });
    
    // Send to STT
    this.sendToSTT(audioBlob);
  }

  private async sendToSTT(audioBlob: Blob): Promise<void> {
    try {
      // Import STT service dynamically to avoid circular dependencies
      const { sttService } = await import('@/services/voice/stt');
      const { chat_id } = (await import('@/core/store')).useChatStore.getState();
      
      if (!chat_id) {
        throw new Error('No chat_id available for STT');
      }
      
      const { transcript } = await sttService.transcribe(audioBlob, chat_id);
      
      if (transcript && transcript.trim().length > 0 && this.options.onTranscriptReady) {
        this.options.onTranscriptReady(transcript.trim());
      }
    } catch (error) {
      console.error('[UniversalSTTRecorder] STT failed:', error);
      this.options.onError?.(error as Error);
    }
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  }

  private cleanup(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  dispose(): void {
    this.stop();
    this.cleanup();
  }
}