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
  
  console.log(`[useChatInitialization] Hook called - threadId: ${threadId}, chat_id: ${chat_id}`);
  
  useEffect(() => {
    console.log(`[useChatInitialization] useEffect triggered - threadId: ${threadId}, chat_id: ${chat_id}`);
    if (threadId) {
      console.log(`[useChatInitialization] Initializing chat: ${threadId}`);
      chatController.initializeForConversation(threadId);
    } else {
      console.log(`[useChatInitialization] No threadId available`);
    }
  }, [threadId]);
};
