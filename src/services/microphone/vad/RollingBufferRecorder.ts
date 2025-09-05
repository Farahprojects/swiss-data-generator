/**
 * 🎯 ROLLING BUFFER RECORDER
 * 
 * Simple recorder that maintains a rolling buffer of audio chunks.
 * Works with the stateless VAD processor.
 */

export interface RollingBufferRecorderOptions {
  lookbackWindowMs?: number;     // How much audio to keep in rolling buffer (default: 750ms)
  chunkDurationMs?: number;      // How often to slice chunks (default: 250ms)
}

export class RollingBufferRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private preBufferChunks: Blob[] = [];
  private activeChunks: Blob[] = [];
  private options: Required<RollingBufferRecorderOptions>;
  private isRecording = false;

  constructor(options: RollingBufferRecorderOptions = {}) {
    this.options = {
      lookbackWindowMs: 750,
      chunkDurationMs: 250,
      ...options
    };
  }

  /**
   * START - Begin recording with rolling buffer
   */
  async start(stream: MediaStream): Promise<void> {
    if (this.isRecording) {
      this.stop();
    }

    // Reset buffers
    this.preBufferChunks = [];
    this.activeChunks = [];

    // Create MediaRecorder with small time slices for rolling buffer
    let recorderOptions: MediaRecorderOptions = { audioBitsPerSecond: 64000 };
    try {
      const preferred = 'audio/webm;codecs=opus';
      const isSupported = (typeof MediaRecorder !== 'undefined' &&
        // @ts-ignore
        typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(preferred));
      if (isSupported) {
        recorderOptions.mimeType = preferred;
      }
    } catch {}

    this.mediaRecorder = new MediaRecorder(stream, recorderOptions);

    // Handle data chunks for rolling buffer
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.handleAudioChunk(event.data);
      }
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('[RollingBufferRecorder] MediaRecorder error:', event);
    };

    // Start recording with small time slices
    this.mediaRecorder.start(this.options.chunkDurationMs);
    this.isRecording = true;
  }

  /**
   * HANDLE AUDIO CHUNK - Manage rolling buffer logic
   */
  private handleAudioChunk(chunk: Blob): void {
    // Always add to pre-buffer first
    this.preBufferChunks.push(chunk);
    
    // Maintain rolling window by removing old chunks
    const maxChunks = Math.ceil(this.options.lookbackWindowMs / this.options.chunkDurationMs);
    if (this.preBufferChunks.length > maxChunks) {
      this.preBufferChunks.shift();
    }
  }

  /**
   * START ACTIVE RECORDING - Move from pre-buffer to active recording
   */
  startActiveRecording(): void {
    // Move current pre-buffer to active chunks
    this.activeChunks = [...this.preBufferChunks];
    this.preBufferChunks = [];
  }

  /**
   * ADD ACTIVE CHUNK - Add chunk to active recording
   */
  addActiveChunk(chunk: Blob): void {
    if (chunk.size > 0) {
      this.activeChunks.push(chunk);
    }
  }

  /**
   * STOP - Stop recording and return final blob
   */
  stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const finalBlob = this.createFinalBlob();
        this.cleanup();
        resolve(finalBlob);
      };

      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      } else {
        const finalBlob = this.createFinalBlob();
        this.cleanup();
        resolve(finalBlob);
      }
    });
  }

  /**
   * CREATE FINAL BLOB - Combine pre-buffer and active chunks
   */
  private createFinalBlob(): Blob | null {
    let allChunks: Blob[] = [];
    
    if (this.activeChunks.length > 0) {
      // We have active recording: use active chunks
      allChunks = this.activeChunks;
    } else if (this.preBufferChunks.length > 0) {
      // No active recording but we have pre-buffer: use pre-buffer
      allChunks = this.preBufferChunks;
    } else {
      return null;
    }

    return new Blob(allChunks, { type: 'audio/webm;codecs=opus' });
  }

  /**
   * CLEANUP - Reset all state
   */
  private cleanup(): void {
    this.isRecording = false;
    this.mediaRecorder = null;
    this.preBufferChunks = [];
    this.activeChunks = [];
  }
}
