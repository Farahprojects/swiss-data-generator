// src/services/voice/tts.ts
import { supabase } from '@/integrations/supabase/client';

class TtsService {
  async speak(messageId: string, text: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('google-text-to-speech', {
      body: { messageId, text },
    });

    if (error) {
      console.error("[TTS] Error invoking google-text-to-speech:", error);
      throw new Error(`Error invoking google-text-to-speech: ${error.message}`);
    }
    
    if (data.error) {
      console.error("[TTS] google-text-to-speech returned an error:", data.error);
      throw new Error(`google-text-to-speech returned an error: ${data.error}`);
    }

    if (!data.audioUrl) {
      console.error("[TTS] Response did not contain an audioUrl.");
      throw new Error("Response from google-text-to-speech was invalid.");
    }

    return data.audioUrl;
  }
}

export const ttsService = new TtsService();
