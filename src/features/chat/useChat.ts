// src/features/chat/useChat.ts
import { useEffect } from 'react';
import { useChatStore } from '@/core/store';
import { chatController } from './ChatController';
import { getOrCreateConversation } from '@/services/api/conversations';

export const useChat = (conversationId?: string, guestId?: string, reportId?: string) => {
  const state = useChatStore();

  useEffect(() => {
    if (conversationId) {
      // Existing logic for direct conversationId
      chatController.initializeConversation(conversationId);
    } else if (guestId && reportId) {
      // New logic: get-or-create by guestId + reportId
      getOrCreateConversation(guestId, reportId)
        .then(({ conversationId }) => {
          chatController.initializeConversation(conversationId);
        })
        .catch(err => {
          console.error('Failed to get/create conversation:', err);
          // Handle error appropriately
        });
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
