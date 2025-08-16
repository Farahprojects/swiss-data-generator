// src/features/chat/useChat.ts
import { useEffect } from 'react';
import { useChatStore } from '@/core/store';
import { chatController } from './ChatController';
import { getOrCreateConversation } from '@/services/api/conversations';

export const useChat = (conversationId?: string, uuid?: string, token?: string) => {
  const state = useChatStore();

  useEffect(() => {

    
    if (conversationId) {
      // Existing logic for direct conversationId

      chatController.initializeConversation(conversationId);
    } else if (uuid && token) {
      // New secure logic: get-or-create by uuid + token

      getOrCreateConversation(uuid, token)
        .then(({ conversationId }) => {

          chatController.initializeConversation(conversationId);
        })
        .catch(err => {
          console.error('[useChat] Failed to get/create conversation:', err);
          // Handle error appropriately
        });
    } else {
      console.log('[useChat] No conversationId or secure tokens provided');
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
