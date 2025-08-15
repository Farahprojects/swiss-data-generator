import { useEffect } from 'react';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { useMicAuthority } from './useMicAuthority';
import { audioPlayer } from '@/services/voice/audioPlayer';

/**
 * PERSISTENT MIC MANAGER - Always Active
 * 
 * This hook runs continuously and manages mic authority based on conversation state.
 * Unlike the FSM, this doesn't get destroyed when the modal closes.
 */
export const useConversationMicManager = (onTranscriptReady?: (transcript: string) => void) => {
  const isConversationOpen = useConversationUIStore((s) => s.isConversationOpen);
  const micAuthority = useMicAuthority(onTranscriptReady);

  // PERSISTENT AUTHORITY REACTION - Always running
  useEffect(() => {
    console.log('[ConversationMicManager] 🎤 Authority reaction - isOpen:', isConversationOpen, 'micIsOn:', micAuthority.micIsOn);
    
    if (!isConversationOpen && micAuthority.micIsOn) {
      // AUTHORITY DECISION: Conversation closed = mic OFF
      console.log('[ConversationMicManager] 🚨 CONVERSATION CLOSED - Disengaging mic authority');
      micAuthority.disengageMic();
      audioPlayer.stop();
      
    } else if (isConversationOpen && !micAuthority.micIsOn) {
      // AUTHORITY DECISION: Conversation opened = mic ON
      console.log('[ConversationMicManager] 🎤 CONVERSATION OPENED - Engaging mic authority');
      micAuthority.engageMic();
    }
    
  }, [isConversationOpen, micAuthority.micIsOn, micAuthority]);

  return micAuthority;
};
