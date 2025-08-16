// src/services/voice/conversationTts.ts
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';

export interface SpeakAssistantOptions {
  conversationId: string;
  messageId: string;
  text: string;
}

class ConversationTtsService {
  async speakAssistant({ conversationId, messageId, text }: SpeakAssistantOptions): Promise<void> {
    console.log('[ConversationTTS] Starting TTS for message:', messageId);
    
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
      console.log('[ConversationTTS] Audio buffer received:', audioBuffer.byteLength, 'bytes');

      if (audioBuffer.byteLength === 0) {
        console.error('[ConversationTTS] Empty audio buffer received');
        throw new Error('Empty audio data received from TTS');
      }

      console.log('[ConversationTTS] Creating audio blob and playing...');
      
      // Convert array buffer to blob and play
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      
      console.log('[ConversationTTS] Blob created:', blob.size, 'bytes, type:', blob.type);

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
          console.error('[ConversationTTS] Audio element state:', {
            src: audio.src,
            readyState: audio.readyState,
            networkState: audio.networkState,
            error: audio.error
          });
          URL.revokeObjectURL(url);
          reject(new Error(`Audio playback failed: ${audio.error?.message || 'Unknown audio error'}`));
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
