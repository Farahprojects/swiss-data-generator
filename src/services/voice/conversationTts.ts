// src/services/voice/conversationTts.ts
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';

export interface SpeakAssistantOptions {
  conversationId: string;
  messageId: string;
  text: string;
}

class ConversationTtsService {
  async speakAssistant({ conversationId, messageId, text }: SpeakAssistantOptions): Promise<void> {
    
    try {
      // Use direct fetch instead of supabase.functions.invoke for binary data
      const response = await fetch(`${SUPABASE_URL}/functions/v1/tts-speak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ conversationId, messageId, text })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ConversationTTS] TTS function error:', response.status, errorText);
        throw new Error(`TTS failed: ${response.status} - ${errorText}`);
      }

      // Get the response as array buffer (binary audio data)
      const audioBuffer = await response.arrayBuffer();

      if (audioBuffer.byteLength === 0) {
        console.error('[ConversationTTS] Empty audio buffer received');
        throw new Error('Empty audio data received from TTS');
      }

      // Convert array buffer to blob and play
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      
      // Return a promise that resolves when audio ends
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        
        audio.onerror = (error) => {
          console.error('[ConversationTTS] Audio playback error:', error);
          console.error('[ConversationTTS] Audio element state:', {
            src: audio.src,
            readyState: audio.readyState,
            networkState: audio.networkState,
            error: audio.error
          });
          URL.revokeObjectURL(url);
          reject(new Error(`Audio playback failed: ${audio.error?.message || 'Unknown audio error'}`));
        };
        

        audio.play().catch(playError => {
          console.error('[ConversationTTS] Audio play() failed:', playError);
          URL.revokeObjectURL(url);
          reject(playError);
        });
      });
      
    } catch (error) {
      console.error('[ConversationTTS] speakAssistant failed:', error);
      throw error;
    }
  }
}

export const conversationTtsService = new ConversationTtsService();
