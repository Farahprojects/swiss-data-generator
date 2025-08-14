// src/services/voice/tts.ts
import { supabase } from '@/integrations/supabase/client';

class TtsService {
  async speak(text: string): Promise<string> {
    console.log(`[TTS] Generating audio for "${text}"...`);

    const { data, error } = await supabase.functions.invoke('tts-handler', {
      body: { text },
    });

    if (error) {
      throw new Error(`Error invoking tts-handler: ${error.message}`);
    }

    // The response is a blob, so we need to create a URL for it
    const audioUrl = URL.createObjectURL(data);
    return audioUrl;
  }
}

export const ttsService = new TtsService();
