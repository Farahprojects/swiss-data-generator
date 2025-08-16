// src/services/voice/conversationTts.ts
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { playTtsAudio } from './ttsAudio';

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

      // Use the robust single-audio-element system
      return new Promise((resolve, reject) => {
        playTtsAudio(audioBuffer, {
          onEnd: () => {
            console.log('[ConversationTTS] TTS playback completed');
            resolve();
          },
          onError: (error) => {
            console.error('[ConversationTTS] TTS playback failed:', error);
            reject(error);
          }
        }).catch(reject);
      });
      
    } catch (error) {
      console.error('[ConversationTTS] speakAssistant failed:', error);
      throw error;
    }
  }
}

export const conversationTtsService = new ConversationTtsService();
