// src/services/voice/tts.ts
import { supabase } from '@/integrations/supabase/client';

class TtsService {
  async speak(chat_id: string, text: string, voice: string = 'Puck'): Promise<string> {
    const { data, error } = await supabase.functions.invoke('google-text-to-speech', {
      body: { chat_id, text, voice },
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

    // Note: This audioUrl is just for debugging - actual playback happens via WebSocket subscription
    console.log("[TTS] Audio uploaded to storage:", data.audioUrl);
    return data.audioUrl;
  }
}

export const ttsService = new TtsService();
