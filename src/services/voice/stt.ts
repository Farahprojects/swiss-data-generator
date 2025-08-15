// src/services/voice/stt.ts
import { supabase } from '@/integrations/supabase/client';

class SttService {
  async transcribe(audioBlob: Blob): Promise<string> {
    console.log(`[STT] Transcribing with Google Speech-to-Text...`);
    
    // Convert blob to base64 for Google STT
    const base64Audio = await this.blobToBase64(audioBlob);
    
    const { data, error } = await supabase.functions.invoke('google-speech-to-text', {
      body: {
        audioData: base64Audio,
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode: 'en-US',
        }
      },
    });

    if (error) {
      console.error('[STT] Google STT error:', error);
      throw new Error(`Error invoking google-speech-to-text: ${error.message}`);
    }

    if (!data || !data.transcript) {
      console.error('[STT] No transcript in response:', data);
      throw new Error('No transcript received from Google STT');
    }

    console.log(`[STT] Transcription result: "${data.transcript}"`);
    return data.transcript;
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const sttService = new SttService();
