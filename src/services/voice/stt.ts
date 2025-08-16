// src/services/voice/stt.ts
import { supabase } from '@/integrations/supabase/client';

class SttService {
  async transcribe(audioBlob: Blob, conversationId?: string, meta?: Record<string, any>): Promise<string> {
    // Validate audio blob before processing
    if (!audioBlob || audioBlob.size === 0) {
      console.warn('[STT] Empty or missing audio blob, skipping transcription');
      throw new Error('Empty audio recording - please try speaking again');
    }
    
    if (audioBlob.size < 1000) { // Less than 1KB is likely too short
      console.warn('[STT] Audio blob too small:', audioBlob.size, 'bytes');
      throw new Error('Recording too short - please speak for longer');
    }
    
    // Convert blob to base64 for Google STT
    const base64Audio = await this.blobToBase64(audioBlob);
    
    const { data, error } = await supabase.functions.invoke('google-speech-to-text', {
      body: {
        audioData: base64Audio,
        conversationId,
        meta,
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
