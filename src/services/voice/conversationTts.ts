// src/services/voice/conversationTts.ts
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { streamPlayerService } from './StreamPlayerService';

export interface SpeakAssistantOptions {
  conversationId: string;
  messageId: string;
  text: string;
}

class ConversationTtsService {
  async speakAssistant({ conversationId, messageId, text }: SpeakAssistantOptions): Promise<void> {
    
    return new Promise(async (resolve, reject) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("User not authenticated for TTS.");
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/google-text-to-speech`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messageId, text })
        });

        if (!response.ok || !response.body) {
          const errorText = await response.text();
          console.error('[ConversationTTS] TTS function error:', response.status, errorText);
          throw new Error(`TTS failed: ${response.status} - ${errorText}`);
        }

        // Pass the stream directly to the player
        await streamPlayerService.playStream(response.body, () => {
          console.log('[ConversationTTS] TTS streaming playback completed');
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
