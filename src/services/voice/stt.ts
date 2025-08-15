// src/services/voice/stt.ts
import { supabase } from '@/integrations/supabase/client';

class SttService {
  private debugAudioSaver?: (audioBlob: Blob, reason: string) => void;

  setDebugAudioSaver(saver: (audioBlob: Blob, reason: string) => void) {
    this.debugAudioSaver = saver;
  }

  async transcribe(audioBlob: Blob): Promise<string> {
    console.log(`[STT] Transcribing with Google Speech-to-Text...`);
    
    // Validate audio blob before processing
    if (!audioBlob || audioBlob.size === 0) {
      console.warn('[STT] Empty or missing audio blob, skipping transcription');
      throw new Error('Empty audio recording - please try speaking again');
    }
    
    if (audioBlob.size < 1000) { // Less than 1KB is likely too short
      console.warn('[STT] Audio blob too small:', audioBlob.size, 'bytes');
      throw new Error('Recording too short - please speak for longer');
    }
    
    console.log(`[STT] Audio blob validated - size: ${audioBlob.size} bytes`);
    
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
      
      // Save debug audio for failed STT
      if (this.debugAudioSaver) {
        console.log('[STT] Saving debug audio for failed transcription');
        this.debugAudioSaver(audioBlob, 'stt-no-transcript');
      }
      
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
