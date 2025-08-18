// src/features/chat/useChat.ts
import { useEffect } from 'react';
import { useChatStore } from '@/core/store';
import { chatController } from './ChatController';
import { getGuestReportMessageIds } from '@/services/api/guestReports';
import { getMessagesByIds } from '@/services/api/messages';

export const useChat = (conversationId?: string, uuid?: string, token?: string) => {
  const state = useChatStore();

  useEffect(() => {
    const ss = typeof window !== 'undefined' ? window.sessionStorage : null;
    const SESSION_KEY = 'therai_conversation_id';

    // New model: conversations table removed. Use uuid (guest id) as key.
    if (!uuid) {
      console.log('[useChat] No uuid provided');
      return;
    }

    // Persist uuid as the session-scoped conversation key
    try { ss?.setItem(SESSION_KEY, uuid); } catch (_e) {}
    chatController.initializeConversation(uuid);

    // Preload messages by IDs from guest_reports.messages
    getGuestReportMessageIds(uuid)
      .then(async (ids) => {
        const msgs = await getMessagesByIds(ids);
        if (msgs.length > 0) {
          state.loadMessages(msgs);
        }
      })
      .catch((err) => {
        console.warn('[useChat] No pre-seeded messages found for guest uuid:', uuid, err?.message || err);
      });
  }, [conversationId, uuid, token]);

  return {
    ...state,
    startTurn: chatController.startTurn,
    sendTextMessage: chatController.sendTextMessage,
    endTurn: chatController.endTurn,
    cancelTurn: chatController.cancelTurn,
  };
};
