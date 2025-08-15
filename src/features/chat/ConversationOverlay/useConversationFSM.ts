import { useState, useEffect } from 'react';
import { llmService } from '@/services/llm/chat';
import { ttsService } from '@/services/voice/tts';
import { audioPlayer } from '@/services/voice/audioPlayer';
import { useChatStore } from '@/core/store';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';

export type ConversationState = 'listening' | 'processing' | 'replying' | 'idle';

/**
 * SIMPLIFIED FSM - No Mic Management
 * 
 * This FSM only handles conversation flow states.
 * Mic authority is managed globally in ChatBox via useConversationMicManager.
 */
export const useConversationFSM = () => {
  const [state, setState] = useState<ConversationState>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const conversationId = useChatStore((s) => s.conversationId)!;
  const addMessage = useChatStore((s) => s.addMessage);
  const isConversationOpen = useConversationUIStore((s) => s.isConversationOpen);

  // Handle transcript from global mic manager
  const handleTranscriptReady = async (transcript: string) => {
    if (!isConversationOpen) return;
    
    console.log('[ConversationFSM] Transcript ready:', transcript);
    
    // Handle empty transcript - stay in listening
    if (!transcript || transcript.trim().length === 0) {
      console.log('[ConversationFSM] Empty transcript - staying in listening mode');
      return;
    }
    
    setState('processing');

    try {
      // Add user message
      addMessage({ 
        id: crypto.randomUUID(), 
        conversationId, 
        role: 'user', 
        text: transcript, 
        createdAt: new Date().toISOString()
      });
      
      // Get AI response
      const assistantMsg = await llmService.chat({ 
        conversationId, 
        userMessage: { text: transcript } 
      });
      
      // Add assistant message
      addMessage({
        ...assistantMsg,
        audioUrl: undefined // Only store text
      });
      
      // Play response
      setState('replying');
      const audioUrl = await ttsService.speak(assistantMsg.id, assistantMsg.text);
      
      audioPlayer.play(audioUrl, () => {
        console.log('[ConversationFSM] AI finished speaking');
        
        // Return to listening with debounce
        setTimeout(() => {
          if (isConversationOpen) {
            setState('listening');
          }
        }, 300);
      });
      
    } catch (error) {
      console.error('[ConversationFSM] Error in AI flow:', error);
      setState('listening');
    }
  };

  // Simple state management based on conversation open/close
  useEffect(() => {
    if (isConversationOpen && state === 'idle') {
      console.log('[ConversationFSM] Conversation opened - transitioning to listening');
      setState('listening');
    } else if (!isConversationOpen && state !== 'idle') {
      console.log('[ConversationFSM] Conversation closed - transitioning to idle');
      audioPlayer.stop();
      setState('idle');
    }
  }, [isConversationOpen, state]);

  return { 
    state,
    audioLevel, // Mock for now - will be provided by global mic manager
    handleTranscriptReady, // Export for global mic manager to use
  };
};