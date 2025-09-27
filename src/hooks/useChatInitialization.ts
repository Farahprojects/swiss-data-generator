import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '@/core/store';
import { chatController } from '@/features/chat/ChatController';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Direct chat initialization - always fetch from source of truth (DB)
 * No more fragile sessionStorage hydration
 * 
 * Architecture:
 * - URL threadId → Direct DB fetch → Store → UI
 * - WebSocket initialized once on app startup
 * - Everything is explicit and direct
 */
export const useChatInitialization = () => {
  const { threadId } = useParams<{ threadId?: string }>();
  const { chat_id, startConversation } = useChatStore();
  const { user } = useAuth();

  useEffect(() => {
    // Initialize WebSocket callbacks once on app startup
    const initializeWebSocket = async () => {
      await chatController.initializeWebSocketCallbacks();
    };
    
    initializeWebSocket();

    // Load threads when user signs in (useChatStore needs this for ChatThreadsSidebar)
    if (user) {
      const { loadThreads, chat_id: existingChatId } = useChatStore.getState();
      loadThreads();
      
      // If there's an existing chat_id in the store, load it
      if (existingChatId && !threadId) {
        // Load the existing conversation
        startConversation(existingChatId);
        chatController.switchToChat(existingChatId);
      }
    }
  }, [user]);

  useEffect(() => {
    // Handle direct URL navigation (typing /c/123 in browser)
    if (threadId && threadId !== "1") {
      // Validate threadId exists in DB before using it
      const validateAndLoadThread = async () => {
        try {
          // Check if this thread exists in our loaded threads
          const { threads } = useChatStore.getState();
          const threadExists = threads.some(thread => thread.id === threadId);
          
          if (threadExists) {
            // Use the same direct flow as handleSwitchToChat
            const { useMessageStore } = await import('@/stores/messageStore');
            useMessageStore.getState().setChatId(threadId);
            startConversation(threadId);
            await chatController.switchToChat(threadId);
          } else {
            useChatStore.getState().clearChat();
          }
        } catch (error) {
          console.error('[useChatInitialization] Error validating thread:', error);
          useChatStore.getState().clearChat();
        }
      };
      
      validateAndLoadThread();
    } else if (threadId === "1") {
      useChatStore.getState().clearChat();
    }
  }, [threadId, startConversation]);
};
