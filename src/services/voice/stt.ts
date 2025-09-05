// src/services/voice/stt.ts
import { supabase } from '@/integrations/supabase/client';

class SttService {
  async transcribe(audioBlob: Blob, chat_id?: string, meta?: Record<string, any>, mode?: string): Promise<{ transcript: string }> {
    
    // Validate audio blob before processing
    if (!audioBlob || audioBlob.size === 0) {
      console.warn('[STT] Empty or missing audio blob, skipping transcription');
      throw new Error('Empty audio recording - please try speaking again');
    }
    
    if (audioBlob.size < 500) { // Reduced from 1KB to 500 bytes for testing
      console.warn('[STT] Audio blob too small:', audioBlob.size, 'bytes');
      throw new Error('Recording too short - please speak for longer');
    }
    
    // CRITICAL: Validate audio format to prevent STT errors
    if (audioBlob.type !== 'audio/webm;codecs=opus') {
      console.error(`[STT] CRITICAL: Audio format mismatch! Expected 'audio/webm;codecs=opus', got '${audioBlob.type}'`);
      throw new Error(`Invalid audio format: ${audioBlob.type}. Expected webm/opus format.`);
    }
    
    // CRITICAL: Validate audio blob size to prevent empty transcripts
    if (audioBlob.size < 1000) {
      console.error(`[STT] CRITICAL: Audio blob too small (${audioBlob.size} bytes) - likely corrupted or empty`);
      throw new Error(`Audio blob too small (${audioBlob.size} bytes). Expected at least 1000 bytes.`);
    }
    
    // Send raw binary audio directly, with config in headers. This mirrors the
    // ChatTextMicrophoneService and aligns both STT pathways.
    const { data, error } = await supabase.functions.invoke('google-speech-to-text', {
      body: audioBlob,
      headers: {
        'X-Meta': JSON.stringify({
          ...(meta || {}), // Pass along any additional meta from the controller
          mode,
          chat_id,
          config: {
            encoding: 'WEBM_OPUS',
            languageCode: 'en-US',
            enableAutomaticPunctuation: true,
            model: 'latest_short' // Mobile-first: Faster model for quicker response
          }
        })
      }
    });

    if (error) {
      console.error('[STT] Google STT error:', error);
      throw new Error(`Error invoking google-speech-to-text: ${error.message}`);
    }

    if (!data) {
      console.error('[STT] No data in response');
      throw new Error('No data received from Google STT');
    }



    // Return the transcript
    return {
      transcript: data.transcript || '',
    };
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
