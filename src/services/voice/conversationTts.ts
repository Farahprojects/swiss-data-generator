// src/services/voice/conversationTts.ts
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { ttsPlaybackMonitor } from './ttsPlaybackMonitor';
import { cleanupAudioElement } from '@/utils/audioContextUtils';

export interface SpeakAssistantOptions {
  conversationId: string;
  messageId: string;
  text: string;
  useOpenAI?: boolean;
}

class ConversationTtsService {
  async speakAssistant({ conversationId, messageId, text, useOpenAI = false }: SpeakAssistantOptions): Promise<void> {
    
    try {
      // Use direct fetch instead of supabase.functions.invoke for binary data
      const response = await fetch(`${SUPABASE_URL}/functions/v1/tts-speak`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ conversationId, messageId, text, useOpenAI })
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
          ttsPlaybackMonitor.cleanup();
          cleanupAudioElement(audio);
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
          ttsPlaybackMonitor.cleanup();
          cleanupAudioElement(audio);
          URL.revokeObjectURL(url);
          reject(new Error(`Audio playback failed: ${audio.error?.message || 'Unknown audio error'}`));
        };
        
        // Attach monitor before playing - wait for loadeddata and attachToAudio
        audio.onloadeddata = async () => {
          try {
            await ttsPlaybackMonitor.attachToAudio(audio);
            console.log('[ConversationTTS] TTS monitor attached successfully');
          } catch (attachError) {
            console.warn('[ConversationTTS] TTS monitor failed to attach, but audio will still play:', attachError);
            // Continue playing even if monitor fails - don't block audio
          }
        };

        audio.play().catch(playError => {
          console.error('[ConversationTTS] Audio play() failed:', playError);
          ttsPlaybackMonitor.cleanup();
          cleanupAudioElement(audio);
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
