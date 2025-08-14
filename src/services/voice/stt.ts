// src/services/voice/stt.ts

import { ProviderName } from '@/core/types';

class SttService {
  async transcribe(audioBlob: Blob, provider: ProviderName = 'local'): Promise<string> {
    console.log(`[STT] Transcribing with ${provider}...`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In a real implementation, you would send the audioBlob to a service
    // like OpenAI Whisper, Google Speech-to-Text, or Deepgram.
    
    // For now, return a mock transcription.
    const mockTranscription = "This is a test transcription of the recorded audio.";
    console.log(`[STT] Transcription complete: "${mockTranscription}"`);
    
    return mockTranscription;
  }
}

export const sttService = new SttService();
