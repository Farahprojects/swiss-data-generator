/**
 * 🎵 NATIVE WEBRTC OPUS ENCODER - Browser Built-in Pipeline
 * 
 * Uses browser's native WebRTC Opus encoding
 * 16kHz, 16-bit PCM mono → Opus codec via MediaRecorder
 * 20ms frames, ~24 kbps for optimal mobile performance
 */

export interface WebRTCOpusOptions {
  sampleRate: number;    // 16000 Hz
  channels: number;      // 1 (mono)
  frameSize: number;     // 20ms frames
  bitrate: number;       // ~24 kbps
}

export class WebRTCOpusEncoder {
  private options: WebRTCOpusOptions;
  private isInitialized = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private onDataCallback: ((data: Blob) => void) | null = null;

  constructor(options: WebRTCOpusOptions = {
    sampleRate: 16000,
    channels: 1,
    frameSize: 20, // 20ms
    bitrate: 24000 // ~24 kbps
  }) {
    this.options = options;
  }

  /**
   * Initialize native WebRTC Opus encoder
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create audio context with 16kHz sample rate
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.options.sampleRate
      });

      this.isInitialized = true;
      console.log('[WebRTCOpusEncoder] ✅ Initialized with native WebRTC Opus:', {
        sampleRate: this.options.sampleRate,
        channels: this.options.channels,
        frameSize: this.options.frameSize,
        bitrate: this.options.bitrate
      });
    } catch (error) {
      console.error('[WebRTCOpusEncoder] ❌ Failed to initialize:', error);
      throw new Error('Failed to initialize WebRTC Opus encoder');
    }
  }

  /**
   * Start encoding from MediaStream
   */
  async startEncoding(stream: MediaStream, onData: (data: Blob) => void): Promise<void> {
    if (!this.isInitialized || !this.audioContext) {
      throw new Error('Encoder not initialized');
    }

    this.stream = stream;
    this.onDataCallback = onData;

    try {
      // Create MediaRecorder with Opus codec
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: this.options.bitrate
      });

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.onDataCallback) {
          this.onDataCallback(event.data);
        }
      };

      // Start recording with 20ms timeslice for real-time streaming
      this.mediaRecorder.start(this.options.frameSize);

      console.log('[WebRTCOpusEncoder] ✅ Started encoding with native Opus');

    } catch (error) {
      console.error('[WebRTCOpusEncoder] Failed to start encoding:', error);
      throw error;
    }
  }

  /**
   * Stop encoding
   */
  stopEncoding(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
    this.onDataCallback = null;
  }

  /**
   * Get frame size in samples
   */
  getFrameSize(): number {
    return (this.options.sampleRate * this.options.frameSize) / 1000;
  }

  /**
   * Get frame size in bytes
   */
  getFrameSizeBytes(): number {
    return this.getFrameSize() * 2; // 16-bit = 2 bytes per sample
  }

  /**
   * Check if Opus is supported
   */
  static isSupported(): boolean {
    return MediaRecorder.isTypeSupported('audio/webm;codecs=opus');
  }

  /**
   * Get supported MIME types
   */
  static getSupportedTypes(): string[] {
    const types = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4;codecs=opus'
    ];
    
    return types.filter(type => MediaRecorder.isTypeSupported(type));
  }

  /**
   * Cleanup encoder
   */
  destroy(): void {
    this.stopEncoding();
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isInitialized = false;
  }
}
