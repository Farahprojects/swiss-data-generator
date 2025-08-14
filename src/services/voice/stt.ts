// src/services/voice/stt.ts
import { supabase } from '@/integrations/supabase/client';

class SttService {
  async transcribe(audioBlob: Blob): Promise<string> {
    console.log(`[STT] Transcribing...`);
    
    const { data, error } = await supabase.functions.invoke('stt-handler', {
      body: audioBlob,
      headers: {
        'Content-Type': 'audio/webm',
      },
    });

    if (error) {
      throw new Error(`Error invoking stt-handler: ${error.message}`);
    }

    return data.transcription;
  }
}

export const sttService = new SttService();
