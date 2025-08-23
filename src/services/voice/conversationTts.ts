// src/services/voice/conversationTts.ts
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';

export interface SpeakAssistantOptions {
  chat_id: string;
  messageId: string;
  text: string;
}

class ConversationTtsService {
  private audioLevel = 0;
  private listeners = new Set<() => void>();

  // ✅ SIMPLIFIED: Removed complex audio analysis - just use simple level control

  // Stop all audio playback and cleanup
  public stopAllAudio(): void {
    // ✅ SIMPLIFIED: Just reset audio level and stop all audio elements
    this.audioLevel = 0;
    this.notifyListeners();
    
    // Stop any playing audio elements
    const allAudioElements = document.querySelectorAll('audio');
    allAudioElements.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    });
  }

  public getCurrentAudioLevel(): number {
    return this.audioLevel;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l());
  }

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

        // ✅ SIMPLIFIED: Direct blob to audio with minimal setup
        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        
        // ✅ ANIMATED: Start with low level and animate during playback
        this.audioLevel = 0.1;
        this.notifyListeners();
        
        // ✅ SIMPLE: Animate based on actual audio playback
        const animateAudio = () => {
          if (audio.ended || audio.paused) {
            this.audioLevel = 0;
            this.notifyListeners();
            return;
          }
          
          // Simple animation: just move with the audio progress
          const progress = audio.currentTime / audio.duration;
          this.audioLevel = 0.3 + (progress * 0.4); // 0.3 to 0.7 range
          this.notifyListeners();
          
          requestAnimationFrame(animateAudio);
        };
        
        // Start animation loop
        requestAnimationFrame(animateAudio);
        
        // ✅ ANIMATED: Single event listener for completion
        audio.addEventListener('ended', () => {
          this.audioLevel = 0;
          this.notifyListeners();
          URL.revokeObjectURL(audioUrl);
          resolve();
        });
        
        audio.addEventListener('error', (error) => {
          console.error('[ConversationTTS] Audio playback error:', error);
          this.audioLevel = 0;
          this.notifyListeners();
          URL.revokeObjectURL(audioUrl);
          reject(error);
        });
        
        // ✅ SIMPLIFIED: Play immediately without load() call
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
