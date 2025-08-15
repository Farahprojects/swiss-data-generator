import { useState, useEffect } from 'react';
import { llmService } from '@/services/llm/chat';
import { ttsService } from '@/services/voice/tts';
import { audioPlayer } from '@/services/voice/audioPlayer';
import { useChatStore } from '@/core/store';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { useMicAuthority } from '@/hooks/useMicAuthority';

export type ConversationState = 'listening' | 'processing' | 'replying' | 'idle';

/**
 * SIMPLIFIED FSM - Reactive to Mic Authority
 * 
 * This FSM no longer manages microphone state directly.
 * It simply reacts to the mic authority's decisions.
 * 
 * Principle: micAuthority.micIsOn is the single source of truth.
 * Everything else is downstream consequences.
 */
export const useConversationFSM = () => {
  const [state, setState] = useState<ConversationState>('idle');
  const conversationId = useChatStore((s) => s.conversationId)!;
  const addMessage = useChatStore((s) => s.addMessage);
  const isConversationOpen = useConversationUIStore((s) => s.isConversationOpen);
  
  // Handle transcript from mic authority
  const handleTranscriptReady = async (transcript: string) => {
    if (!isConversationOpen || !micAuthority.micIsOn) return;
    
    console.log('[ConversationFSM] Transcript ready:', transcript);
    
    // Handle empty transcript - mic stays on, just wait
    if (!transcript || transcript.trim().length === 0) {
      console.log('[ConversationFSM] Empty transcript - staying in listening mode');
      return;
    }
    
    // Turn off mic during processing (authority decision)
    await micAuthority.disengageMic();
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
            setState('listening'); // This will trigger mic re-engagement
          }
        }, 300);
      });
      
    } catch (error) {
      console.error('[ConversationFSM] Error in AI flow:', error);
      setState('listening'); // Return to listening on error
    }
  };

  // MIC AUTHORITY - Single source of truth
  const micAuthority = useMicAuthority(handleTranscriptReady);

  // CENTRALIZED AUTHORITY REACTION - Only one useEffect needed
  useEffect(() => {
    console.log('[ConversationFSM] Authority reaction - isOpen:', isConversationOpen, 'state:', state, 'micIsOn:', micAuthority.micIsOn);
    
    if (!isConversationOpen) {
      // AUTHORITY DECISION: Conversation closed = mic OFF
      console.log('[ConversationFSM] 🚨 CONVERSATION CLOSED - Disengaging mic authority');
      micAuthority.disengageMic();
      audioPlayer.stop();
      setState('idle');
      
    } else if (state === 'listening' && !micAuthority.micIsOn) {
      // AUTHORITY DECISION: Want to listen but mic is off = engage mic
      console.log('[ConversationFSM] 🎤 LISTENING STATE - Engaging mic authority');
      micAuthority.engageMic();
      
    } else if (state !== 'listening' && micAuthority.micIsOn) {
      // AUTHORITY DECISION: Not listening but mic is on = disengage mic
      console.log('[ConversationFSM] 🔇 NOT LISTENING - Disengaging mic authority');
      micAuthority.disengageMic();
    }
    
  }, [isConversationOpen, state, micAuthority.micIsOn]);

  // Initialize conversation state when opened
  useEffect(() => {
    if (isConversationOpen && state === 'idle') {
      console.log('[ConversationFSM] Conversation opened - transitioning to listening');
      setState('listening');
    }
  }, [isConversationOpen, state]);

  return { 
    state,
    isRecording: micAuthority.micIsOn, // Mic authority is the truth
    isProcessing: micAuthority.isProcessing,
    audioLevel: micAuthority.audioLevel
  };
};