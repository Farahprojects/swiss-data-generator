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
      // Request mic access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true
        }
      });

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
    
    const checkLevel = () => {
      if (!this.isRecording || !this.analyser) return;

      this.analyser.getFloatTimeDomainData(buffer);
      
      // Calculate RMS energy
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
      }
      const rms = Math.sqrt(sum / buffer.length);
      const level = Math.min(1, rms * 10);

      this.options.onLevel?.(level);

      // Check for silence
      if (level < this.options.silenceThreshold!) {
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
        }
        this.silenceTimer = setTimeout(() => {
          this.stop();
        }, this.options.silenceDuration);
      } else {
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
      // Placeholder - replace with your STT service
      const transcript = "Hello, this is a test transcription";
      
      if (transcript && this.options.onTranscriptReady) {
        this.options.onTranscriptReady(transcript);
      }
    } catch (error) {
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