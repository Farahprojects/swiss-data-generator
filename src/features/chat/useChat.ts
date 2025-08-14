// src/features/chat/useChat.ts
import { useEffect } from 'react';
import { useChatStore } from '@/core/store';
import { chatController } from './ChatController';
import { getOrCreateConversation } from '@/services/api/conversations';

export const useChat = (conversationId?: string, guestId?: string, reportId?: string) => {
  const state = useChatStore();

  useEffect(() => {
    console.log('[useChat] useEffect triggered - conversationId:', conversationId, 'guestId:', guestId, 'reportId:', reportId);
    
    if (conversationId) {
      // Existing logic for direct conversationId
      console.log('[useChat] Using existing conversationId:', conversationId);
      chatController.initializeConversation(conversationId);
    } else if (guestId && reportId) {
      // New logic: get-or-create by guestId + reportId
      console.log('[useChat] Getting/creating conversation for guestId:', guestId, 'reportId:', reportId);
      getOrCreateConversation(guestId, reportId)
        .then(({ conversationId }) => {
          console.log('[useChat] Got conversationId:', conversationId);
          chatController.initializeConversation(conversationId);
        })
        .catch(err => {
          console.error('[useChat] Failed to get/create conversation:', err);
          // Handle error appropriately
        });
    } else {
      console.log('[useChat] No conversationId, guestId, or reportId provided');
    }
  }, [conversationId, guestId, reportId]);

  return {
    ...state,
    startTurn: chatController.startTurn,
    sendTextMessage: chatController.sendTextMessage,
    endTurn: chatController.endTurn,
    cancelTurn: chatController.cancelTurn,
  };
};
