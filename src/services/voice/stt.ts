// src/services/voice/stt.ts
import { supabase } from '@/integrations/supabase/client';

class SttService {
  async transcribe(audioBlob: Blob, chat_id?: string, meta?: Record<string, any>, chattype?: string): Promise<{ transcript: string }> {
    
    // Validate audio blob before processing
    if (!audioBlob || audioBlob.size === 0) {
      console.warn('[STT] Empty or missing audio blob, skipping transcription');
      throw new Error('Empty audio recording - please try speaking again');
    }
    
    if (audioBlob.size < 500) { // Reduced from 1KB to 500 bytes for testing
      console.warn('[STT] Audio blob too small:', audioBlob.size, 'bytes');
      throw new Error('Recording too short - please speak for longer');
    }
    
    // Google STT V2: Simplified validation - just check size
    if (audioBlob.size < 100) {
      console.error(`[STT] Audio blob too small (${audioBlob.size} bytes) - likely empty`);
      throw new Error(`Audio blob too small (${audioBlob.size} bytes). Expected at least 100 bytes.`);
    }
    
    // OpenAI Whisper: Log simplified payload

    // OpenAI Whisper: Send multipart/form-data with minimal fields
    const form = new FormData();
    form.append('file', audioBlob, 'audio');
    if (chat_id) form.append('chat_id', chat_id);
    if (chattype) form.append('chattype', chattype);
    form.append('language', 'en');

    const { data, error } = await supabase.functions.invoke('openai-whisper', {
      body: form
    });

    if (error) {
      console.error('[STT] OpenAI Whisper error:', error);
      throw new Error(`Error invoking openai-whisper: ${error.message}`);
    }

    if (!data) {
      console.error('[STT] No data in response');
      throw new Error('No data received from OpenAI Whisper');
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
