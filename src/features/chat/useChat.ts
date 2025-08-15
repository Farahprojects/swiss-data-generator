// src/features/chat/useChat.ts
import { useEffect } from 'react';
import { useChatStore } from '@/core/store';
import { chatController } from './ChatController';
import { getOrCreateConversation } from '@/services/api/conversations';

export const useChat = (conversationId?: string, uuid?: string, token?: string) => {
  const state = useChatStore();

  useEffect(() => {
    console.log('[useChat] useEffect triggered - conversationId:', conversationId, 'uuid:', uuid, 'hasToken:', !!token);
    
    if (conversationId) {
      // Existing logic for direct conversationId
      console.log('[useChat] Using existing conversationId:', conversationId);
      chatController.initializeConversation(conversationId);
    } else if (uuid && token) {
      // New secure logic: get-or-create by uuid + token
      console.log('[useChat] Getting/creating conversation with secure tokens - uuid:', uuid);
      getOrCreateConversation(uuid, token)
        .then(({ conversationId }) => {
          console.log('[useChat] Got conversationId:', conversationId);
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
