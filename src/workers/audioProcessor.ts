
// Web Worker for audio processing to prevent UI blocking
export interface AudioProcessingMessage {
  type: 'CONVERT_TO_BASE64' | 'COMPRESS_AUDIO';
  data: {
    audioBlob?: Blob;
    audioChunks?: Blob[];
    compressionLevel?: number;
  };
}

export interface AudioProcessingResponse {
  type: 'BASE64_RESULT' | 'COMPRESSION_RESULT' | 'ERROR';
  data: {
    base64Audio?: string;
    compressedBlob?: Blob;
    error?: string;
  };
}

self.addEventListener('message', async (event: MessageEvent<AudioProcessingMessage>) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'CONVERT_TO_BASE64': {
        if (data.audioChunks) {
          // Process audio chunks efficiently
          const audioBlob = new Blob(data.audioChunks, { type: 'audio/webm;codecs=opus' });
          const base64Audio = await convertBlobToBase64(audioBlob);
          
          self.postMessage({
            type: 'BASE64_RESULT',
            data: { base64Audio }
          } as AudioProcessingResponse);
        }
        break;
      }
      
      case 'COMPRESS_AUDIO': {
        if (data.audioBlob) {
          const compressedBlob = await compressAudio(data.audioBlob, data.compressionLevel || 0.7);
          
          self.postMessage({
            type: 'COMPRESSION_RESULT',
            data: { compressedBlob }
          } as AudioProcessingResponse);
        }
        break;
      }
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    } as AudioProcessingResponse);
  }
});

async function convertBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function compressAudio(audioBlob: Blob, quality: number): Promise<Blob> {
  // Simple audio compression by reducing bit rate
  // This is a basic implementation - for production, consider using a proper audio library
  return audioBlob; // For now, return original blob
}
