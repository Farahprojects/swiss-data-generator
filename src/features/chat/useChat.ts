// src/features/chat/useChat.ts
import { useEffect } from 'react';
import { useChatStore } from '@/core/store';
import { chatController } from './ChatController';
import { getOrCreateConversation } from '@/services/api/conversations';

export const useChat = (conversationId?: string, uuid?: string, token?: string) => {
  const state = useChatStore();

  useEffect(() => {
    const ss = typeof window !== 'undefined' ? window.sessionStorage : null;
    const SESSION_KEY = 'therai_conversation_id';

    // If conversationId provided via route, persist it for this tab
    if (conversationId) {
      try { ss?.setItem(SESSION_KEY, conversationId); } catch (_e) {}
      // Existing logic for direct conversationId
      chatController.initializeConversation(conversationId);
      return;
    }

    // If we have a cached conversation for this tab, use it
    const cachedConv = ss?.getItem(SESSION_KEY);
    if (cachedConv) {
      chatController.initializeConversation(cachedConv);
      return;
    }

    if (uuid) {
      // Get-or-create by uuid only (no token needed). Cache per-tab once resolved.
      getOrCreateConversation(uuid)
        .then(({ conversationId: newId }) => {
          try { ss?.setItem(SESSION_KEY, newId); } catch (_e) {}
          chatController.initializeConversation(newId);
        })
        .catch(err => {
          console.error('[useChat] Failed to get/create conversation:', err);
        });
    } else {
      console.log('[useChat] No conversationId or uuid provided');
    }
  }, [conversationId, uuid, token]);

  return {
    ...state,
    startTurn: chatController.startTurn,
    sendTextMessage: chatController.sendTextMessage,
    endTurn: chatController.endTurn,
    cancelTurn: chatController.cancelTurn,
  };
};
