// src/services/voice/conversationTts.ts
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
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
        const { data: { session } } = await supabase.auth.getSession();
        const selectedVoiceName = useChatStore.getState().ttsVoice || 'Puck';
        const googleVoiceCode = `en-US-Chirp3-HD-${selectedVoiceName}`;

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

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[ConversationTTS] TTS function error:', response.status, errorText);
          throw new Error(`TTS failed: ${response.status} - ${errorText}`);
        }

        // Simple blob-based approach - no streaming, no MediaSource
        const blob = await response.blob();
        const audio = new Audio(URL.createObjectURL(blob));
        
        audio.addEventListener('ended', () => {
          URL.revokeObjectURL(audio.src); // Clean up the object URL
          resolve();
        });
        
        audio.addEventListener('error', (error) => {
          console.error('[ConversationTTS] Audio playback error:', error);
          URL.revokeObjectURL(audio.src);
          reject(error);
        });
        
        await audio.play();
        
      } catch (error) {
        console.error('[ConversationTTS] speakAssistant failed:', error);
        reject(error);
      }
    });
  }

  async getFallbackAudio(chat_id: string, text: string): Promise<string> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const selectedVoiceName = useChatStore.getState().ttsVoice || 'Puck';
      const googleVoiceCode = `en-US-Chirp3-HD-${selectedVoiceName}`;

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

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS fallback failed: ${response.status} - ${errorText}`);
      }
      
      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);

    } catch (error) {
      console.error('[ConversationTTS] getFallbackAudio failed:', error);
      throw error;
    }
  }
}

export const conversationTtsService = new ConversationTtsService();
