// src/services/voice/conversationTts.ts
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { streamPlayerService } from './StreamPlayerService';
import { useChatStore } from '@/core/store';

export interface SpeakAssistantOptions {
  chat_id: string;
  messageId: string;
  text: string;
}

class ConversationTtsService {
  async speakAssistant({ chat_id, messageId, text }: SpeakAssistantOptions): Promise<void> {
    
    return new Promise(async (resolve, reject) => {
      try {
        const { data: { session } } = await supabase.auth.getSession(); // Get session if available, don't fail if not.
        const selectedVoiceName = useChatStore.getState().ttsVoice || 'Puck'; // Get voice from store, default to Puck
        const googleVoiceCode = `en-US-Chirp3-HD-${selectedVoiceName}`; // Construct the voice code directly

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLISHABLE_KEY,
        };

        if (session) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/google-text-to-speech`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ chat_id, text, voice: googleVoiceCode })
        });

        if (!response.ok || !response.body) {
          const errorText = await response.text();
          console.error('[ConversationTTS] TTS function error:', response.status, errorText);
          throw new Error(`TTS failed: ${response.status} - ${errorText}`);
        }

        // Pass the stream directly to the player
        await streamPlayerService.playStream(response.body, () => {
          resolve();
        });
        
      } catch (error) {
        console.error('[ConversationTTS] speakAssistant failed:', error);
        reject(error);
      }
    });
  }
}

export const conversationTtsService = new ConversationTtsService();
