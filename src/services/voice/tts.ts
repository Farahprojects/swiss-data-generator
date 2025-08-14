// src/services/voice/tts.ts
import { supabase } from '@/integrations/supabase/client';

class TtsService {
  async speak(text: string): Promise<string> {
    console.log(`[TTS] Generating audio for "${text}"...`);

    const { data, error } = await supabase.functions.invoke('tts-handler', {
      body: { text },
    });

    if (error) {
      console.error("[TTS] Error invoking tts-handler:", error);
      throw new Error(`Error invoking tts-handler: ${error.message}`);
    }

    if (data instanceof Blob) {
      console.log("[TTS] Received audio blob, creating URL.");
      const audioUrl = URL.createObjectURL(data);
      return audioUrl;
    } else {
      console.error("[TTS] Response was not a blob. Full response:", data);
      // Attempt to parse the error if it's a JSON object
      const errorMessage = data?.error || "Unknown TTS error: Response was not a blob.";
      throw new Error(errorMessage);
    }
  }
}

export const ttsService = new TtsService();
