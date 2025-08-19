// src/features/chat/useChat.ts
import { useEffect } from 'react';
import { useChatStore } from '@/core/store';
import { chatController } from './ChatController';
import { getChatIdForGuest } from '@/services/api/guestReports';

export const useChat = (chat_id?: string, guestId?: string) => {
  const state = useChatStore();

  useEffect(() => {
    const ss = typeof window !== 'undefined' ? window.sessionStorage : null;
    const SESSION_KEY = 'therai_chat_id';

    // If chat_id provided directly, persist it for this tab
    if (chat_id) {
      try { ss?.setItem(SESSION_KEY, chat_id); } catch (_e) {}
      chatController.initializeConversation(chat_id);
      return;
    }

    // If we have a cached chat_id for this tab, use it
    const cachedChatId = ss?.getItem(SESSION_KEY);
    if (cachedChatId) {
      chatController.initializeConversation(cachedChatId);
      return;
    }

    if (guestId) {
      // Verify guest and get their chat_id
      getChatIdForGuest(guestId)
        .then((verifiedChatId) => {
          if (verifiedChatId) {
            try { ss?.setItem(SESSION_KEY, verifiedChatId); } catch (_e) {}
            chatController.initializeConversation(verifiedChatId);
          } else {
            console.error('[useChat] Failed to get chat_id for guest:', guestId);
          }
        })
        .catch(err => {
          console.error('[useChat] Failed to verify guest and get chat_id:', err);
        });
    } else {
      console.log('[useChat] No chat_id or guestId provided');
    }
  }, [chat_id, guestId]);

  return {
    ...state,
    startTurn: chatController.startTurn,
    sendTextMessage: chatController.sendTextMessage,
    endTurn: chatController.endTurn,
    cancelTurn: chatController.cancelTurn,
  };
};
