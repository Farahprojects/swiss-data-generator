// src/services/voice/recorder.ts
import { sharedMicStream } from './sharedMicStream';

class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  getStream(): MediaStream | null {
    return this.stream;
  }

  async start(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      console.warn('[AudioRecorder] Already recording.');
      return;
    }

    try {
      console.log('[AudioRecorder] Requesting shared mic stream');
      this.stream = await sharedMicStream.requestStream('conversation-recorder');
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        // Automatically handled by stop() method's promise
      };

      this.mediaRecorder.start();
      console.log('[AudioRecorder] Recording started with shared stream.');
    } catch (error) {
      console.error('[AudioRecorder] Error starting recorder:', error);
      throw new Error('Could not start audio recording. Please grant microphone permissions.');
    }
  }

  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        return reject('Recorder is not active.');
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        // Release shared stream instead of stopping tracks directly
        console.log('[AudioRecorder] Releasing shared mic stream');
        sharedMicStream.releaseStream('conversation-recorder');
        
        this.mediaRecorder = null;
        this.stream = null;
        console.log('[AudioRecorder] Recording stopped. Blob created.');
        resolve(audioBlob);
      };
      
      this.mediaRecorder.onerror = (event) => {
          reject(event);
      };

      this.mediaRecorder.stop();
    });
  }
  
  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      
      // Release shared stream instead of stopping tracks directly
      console.log('[AudioRecorder] Cancelling - releasing shared mic stream');
      sharedMicStream.releaseStream('conversation-recorder');
      
      this.mediaRecorder = null;
      this.stream = null;
      this.audioChunks = [];
      console.log('[AudioRecorder] Recording cancelled.');
    }
  }
}

export const audioRecorder = new AudioRecorder();
