import { useState, useEffect } from 'react';
import { audioRecorder } from '@/services/voice/recorder';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { ttsService } from '@/services/voice/tts';
import { audioPlayer } from '@/services/voice/audioPlayer';
import { useChatStore } from '@/core/store';
import { SilenceDetector } from './audioAnalyser';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';

export type ConversationState = 'listening' | 'processing' | 'replying';

export const useConversationFSM = () => {
  const [state, setState] = useState<ConversationState>('listening');
  const conversationId = useChatStore((s) => s.conversationId)!;
  const addMessage = useChatStore((s) => s.addMessage);
  const [detector, setDetector] = useState<SilenceDetector | null>(null);
  const [fallbackTimer, setFallbackTimer] = useState<number | null>(null);
  const isConversationOpen = useConversationUIStore((s) => s.isConversationOpen);

  // start listening when entering listening state & overlay open
  useEffect(() => {
    if (state !== 'listening' || !isConversationOpen) return;
    (async () => {
      await audioRecorder.start();
      // 20s hard cap fallback (Safari / permission quirks)
      setFallbackTimer(window.setTimeout(() => handleSilence(), 20000));
      const stream = audioRecorder.getStream();
      if (stream) {
        const det = new SilenceDetector(() => handleSilence());
        await det.attachStream(stream);
        setDetector(det);
      }
    })();
    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      detector?.cleanup();
      setDetector(null);
      // ensure mic is off when leaving listening or overlay closes
      audioRecorder.cancel();
    };
  }, [state, isConversationOpen]);

  const handleSilence = async () => {
    console.log('[ConversationFSM] handleSilence called - state:', state, 'isOpen:', isConversationOpen);
    
    if (state !== 'listening' || !isConversationOpen) {
      console.log('[ConversationFSM] Skipping silence handling - wrong state or overlay closed');
      return;
    }
    
    if (fallbackTimer) clearTimeout(fallbackTimer);
    console.log('[ConversationFSM] Transitioning to processing state');
    setState('processing');
    
    let blob: Blob;
    try {
      console.log('[ConversationFSM] Stopping audio recorder...');
      blob = await audioRecorder.stop();
      console.log('[ConversationFSM] Audio blob created, size:', blob.size, 'bytes');
    } catch (error) {
      console.warn('[ConversationFSM] Audio recorder already stopped, creating empty blob:', error);
      blob = new Blob();
    }
    detector?.cleanup();

    try {
      console.log('[ConversationFSM] Starting STT transcription...');
      const transcription = await sttService.transcribe(blob);
      console.log('[ConversationFSM] STT transcription received:', transcription);
      
      if (!transcription || transcription.trim().length === 0) {
        console.warn('[ConversationFSM] Empty transcription received, returning to listening');
        setState('listening');
        return;
      }
      
      console.log('[ConversationFSM] Adding user message to store...');
      addMessage({ 
        id: crypto.randomUUID(), 
        conversationId, 
        role: 'user', 
        text: transcription, 
        createdAt: new Date().toISOString() 
      });
      
      console.log('[ConversationFSM] Calling LLM service...');
      const assistantMsg = await llmService.chat({ conversationId, userMessage: { text: transcription } });
      console.log('[ConversationFSM] LLM response received:', assistantMsg.text?.substring(0, 50) + '...');
      
      console.log('[ConversationFSM] Adding assistant message to store...');
      addMessage(assistantMsg);
      
      console.log('[ConversationFSM] Transitioning to replying state');
      setState('replying');
      
      console.log('[ConversationFSM] Starting TTS conversion...');
      const audioUrl = await ttsService.speak(assistantMsg.id, assistantMsg.text);
      console.log('[ConversationFSM] TTS audio URL received:', audioUrl);
      
      console.log('[ConversationFSM] Starting audio playback...');
      audioPlayer.play(audioUrl, () => {
        console.log('[ConversationFSM] Audio playback completed');
        if (useConversationUIStore.getState().isConversationOpen) {
          console.log('[ConversationFSM] Returning to listening state');
          setState('listening');
        } else {
          console.log('[ConversationFSM] Overlay closed during playback, not returning to listening');
        }
      });
      
    } catch (err) {
      console.error('[ConversationFSM] Error in conversation flow:', err);
      console.error('[ConversationFSM] Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
      // brief cooldown to avoid tight error loops
      setTimeout(() => {
        if (useConversationUIStore.getState().isConversationOpen) {
          console.log('[ConversationFSM] Error recovery - returning to listening state');
          setState('listening');
        }
      }, 2000);
    }
  };

  return { state };
};
