// src/services/voice/conversationTts.ts
import { supabase } from '@/integrations/supabase/client';

export interface SpeakAssistantOptions {
  conversationId: string;
  messageId: string;
  text: string;
}

class ConversationTtsService {
  async speakAssistant({ conversationId, messageId, text }: SpeakAssistantOptions): Promise<void> {
    console.log('[ConversationTTS] Starting TTS for message:', messageId);
    
    try {
      const { data, error } = await supabase.functions.invoke('tts-speak', {
        body: { conversationId, messageId, text }
      });

      if (error) {
        console.error('[ConversationTTS] TTS function error:', error);
        throw new Error(`TTS failed: ${error.message}`);
      }

      // The response should be audio bytes
      if (!data) {
        console.error('[ConversationTTS] No audio data received');
        throw new Error('No audio data received from TTS');
      }

      console.log('[ConversationTTS] Audio received, creating blob and playing...');
      
      // Convert response to blob and play
      const blob = new Blob([data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      
      // Return a promise that resolves when audio ends
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          console.log('[ConversationTTS] Audio playback ended');
          URL.revokeObjectURL(url);
          resolve();
        };
        
        audio.onerror = (error) => {
          console.error('[ConversationTTS] Audio playback error:', error);
          URL.revokeObjectURL(url);
          reject(new Error('Audio playback failed'));
        };
        
        audio.onloadstart = () => console.log('[ConversationTTS] Audio loading started');
        audio.oncanplay = () => console.log('[ConversationTTS] Audio ready to play');
        
        console.log('[ConversationTTS] Starting audio playback');
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
