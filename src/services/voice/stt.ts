// src/services/voice/stt.ts
import { supabase } from '@/integrations/supabase/client';

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
    
    // DETAILED FRONTEND LOGGING FOR INVESTIGATION
    console.log('[STT] 🔍 FRONTEND AUDIO BLOB DETAILS:', {
      size: audioBlob.size,
      type: audioBlob.type,
      chat_id,
      mode,
      sessionId,
      meta
    });
    
    // Read first few bytes to see what we're actually sending
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    console.log('[STT] 🔍 AUDIO BLOB BINARY HEADER:', {
      firstBytes: Array.from(uint8Array.slice(0, 16)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '),
      lastBytes: Array.from(uint8Array.slice(-16)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')
    });
    
    const config = {
      encoding: 'WEBM_OPUS',
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      model: 'latest_short' // Mobile-first: Faster model for quicker response
    };
    
    console.log('[STT] 🔍 SENDING TO GOOGLE STT:', {
      config,
      mode,
      sessionId
    });
    
    // Send raw binary audio directly, with config in headers. This mirrors the
    // ChatTextMicrophoneService and aligns both STT pathways.
    const { data, error } = await supabase.functions.invoke('google-speech-to-text', {
      body: audioBlob,
      headers: {
        'X-Meta': JSON.stringify({
          ...(meta || {}), // Pass along any additional meta from the controller
          mode,
          sessionId,
          config
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
