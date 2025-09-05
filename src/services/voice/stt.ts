// src/services/voice/stt.ts
import { supabase } from '@/integrations/supabase/client';
import { audioCaptureManager } from '@/services/voice/AudioCaptureManager';

class SttService {
  async transcribe(audioBlob: Blob, chat_id?: string, meta?: Record<string, any>, mode?: string, sessionId?: string): Promise<{ transcript: string }> {
    
    // Validate audio blob before processing
    if (!audioBlob || audioBlob.size === 0) {
      console.warn('[STT] Empty or missing audio blob, skipping transcription');
      throw new Error('Empty audio recording - please try speaking again');
    }
    
    if (audioBlob.size < 500) { // Reduced from 1KB to 500 bytes for testing
      console.warn('[STT] Audio blob too small:', audioBlob.size, 'bytes');
      throw new Error('Recording too short - please speak for longer');
    }
    
    // Send raw binary audio directly, with config in headers. This mirrors the
    // ChatTextMicrophoneService and aligns both STT pathways.
    const { data, error } = await supabase.functions.invoke('google-speech-to-text', {
      body: audioBlob,
      headers: {
        'X-Meta': JSON.stringify({
          ...(meta || {}), // Pass along any additional meta from the controller
          mode,
          sessionId,
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
      console.log('🟡 [STT] STT error occurred - but keeping mic alive for retry');
      // No longer calling audioCleanup() on STT errors - mic stays alive
      throw new Error(`Error invoking google-speech-to-text: ${error.message}`);
    }

    if (!data) {
      console.error('[STT] No data in response');
      console.log('🟡 [STT] No data response - but keeping mic alive for retry');
      // No longer calling audioCleanup() on no data - mic stays alive
      throw new Error('No data received from Google STT');
    }



    // Backend cleanup flag received - but we don't kill the mic anymore
    if ((data as any).cleanup) {
      console.log('🟡 [STT] Backend cleanup flag received - but keeping mic alive for next turn');
      // No longer calling audioCleanup() - mic stays alive between turns
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
