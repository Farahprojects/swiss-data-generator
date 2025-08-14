// src/services/voice/tts.ts
import { supabase } from '@/integrations/supabase/client';

class TtsService {
  async speak(messageId: string, text: string): Promise<string> {
    console.log(`[TTS] Requesting audio for message ${messageId}...`);

    const { data, error } = await supabase.functions.invoke('tts-handler', {
      body: { messageId, text },
    });

    if (error) {
      console.error("[TTS] Error invoking tts-handler:", error);
      throw new Error(`Error invoking tts-handler: ${error.message}`);
    }
    
    if (data.error) {
      console.error("[TTS] tts-handler returned an error:", data.error);
      throw new Error(`tts-handler returned an error: ${data.error}`);
    }

    if (!data.audioUrl) {
      console.error("[TTS] Response did not contain an audioUrl.");
      throw new Error("Response from tts-handler was invalid.");
    }

    console.log(`[TTS] Received audio URL: ${data.audioUrl}`);
    return data.audioUrl;
  }
}

export const ttsService = new TtsService();
