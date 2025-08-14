// src/features/chat/useChat.ts
import { useEffect } from 'react';
import { useChatStore } from '@/core/store';
import { chatController } from './ChatController';

export const useChat = (conversationId?: string) => {
  const state = useChatStore();

  useEffect(() => {
    chatController.initializeConversation(conversationId);
  }, [conversationId]);

  return {
    ...state,
    startTurn: chatController.startTurn,
    sendTextMessage: chatController.sendTextMessage,
    endTurn: chatController.endTurn,
    cancelTurn: chatController.cancelTurn,
  };
};
