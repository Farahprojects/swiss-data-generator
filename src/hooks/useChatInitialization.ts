import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '@/core/store';
import { chatController } from '@/features/chat/ChatController';

/**
 * Centralized chat initialization hook
 * Single responsibility: Initialize chat when threadId changes
 * 
 * Architecture:
 * - URL threadId → ChatController → Store → Components
 * - No complex logic, just one moving part
 */
export const useChatInitialization = () => {
  const { threadId } = useParams<{ threadId?: string }>();
  const { chat_id } = useChatStore();
  
  useEffect(() => {
    if (threadId && threadId !== chat_id) {
      console.log(`[useChatInitialization] Initializing chat: ${threadId}`);
      chatController.initializeForConversation(threadId);
    }
  }, [threadId, chat_id]);
};
