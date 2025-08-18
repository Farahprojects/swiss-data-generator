// src/features/chat/useChat.ts
import { useEffect } from 'react';
import { useChatStore } from '@/core/store';
import { chatController } from './ChatController';

export const useChat = (conversationId?: string, uuid?: string, token?: string) => {
  const state = useChatStore();

  useEffect(() => {
    const ss = typeof window !== 'undefined' ? window.sessionStorage : null;
    const SESSION_KEY = 'therai_conversation_id';

    // Use uuid (guest id) as the conversation key
    if (!uuid) {
      console.log('[useChat] No uuid provided');
      return;
    }

    // Persist uuid as the session-scoped conversation key
    try { ss?.setItem(SESSION_KEY, uuid); } catch (_e) {}
    chatController.initializeConversation(uuid);
  }, [conversationId, uuid, token]);

  return {
    ...state,
    startTurn: chatController.startTurn,
    sendTextMessage: chatController.sendTextMessage,
    endTurn: chatController.endTurn,
    cancelTurn: chatController.cancelTurn,
  };
};
