// src/features/chat/useChat.ts
import { useEffect } from 'react';
import { useChatStore } from '@/core/store';
import { chatController } from './ChatController';
import { getSessionIds } from '@/services/auth/sessionIds';

export const useChat = (conversationId?: string, guestId?: string) => {
  const state = useChatStore();

  useEffect(() => {
    const ss = typeof window !== 'undefined' ? window.sessionStorage : null;
    const MESSAGE_IDS_KEY = 'message_ids';

    // Get IDs from session storage
    const { guestId: sessionGuestId, chatId } = getSessionIds();
    const activeGuestId = guestId || sessionGuestId;

    if (!activeGuestId) {
      console.log('[useChat] No guest ID provided');
      return;
    }

    if (!chatId) {
      console.log('[useChat] No chat ID found in session storage');
      return;
    }

    console.log('[useChat] Initializing chat with:', { guestId: activeGuestId, chatId });

    // Initialize with empty message IDs array for this session
    try { ss?.setItem(MESSAGE_IDS_KEY, JSON.stringify([])); } catch (_e) {}
    
    // Use chatId as the conversation key for message loading
    chatController.initializeConversation(chatId);
  }, [conversationId, guestId]);

  return {
    ...state,
    startTurn: chatController.startTurn,
    sendTextMessage: chatController.sendTextMessage,
    endTurn: chatController.endTurn,
    cancelTurn: chatController.cancelTurn,
  };
};