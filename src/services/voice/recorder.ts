// src/services/voice/recorder.ts

class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      console.warn('Recorder is already recording.');
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        // Automatically handled by stop() method's promise
      };

      this.mediaRecorder.start();
      console.log('Recording started.');
    } catch (error) {
      console.error('Error starting recorder:', error);
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
        this.stream?.getTracks().forEach(track => track.stop());
        this.mediaRecorder = null;
        this.stream = null;
        console.log('Recording stopped. Blob created.');
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
      this.stream?.getTracks().forEach(track => track.stop());
      this.mediaRecorder = null;
      this.stream = null;
      this.audioChunks = [];
      console.log('Recording cancelled.');
    }
  }
}

export const audioRecorder = new AudioRecorder();
