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
      const { loadThreads } = useChatStore.getState();
      loadThreads();
      // No persistence - always start fresh from URL
    }
  }, [user]);

  useEffect(() => {
    // Handle direct URL navigation (typing /c/123 in browser)
    if (threadId && threadId !== "1" && user) {
      // Validate threadId exists in DB before using it
      const validateAndLoadThread = async () => {
        try {
          // Ensure threads are loaded first
          const { threads, loadThreads } = useChatStore.getState();
          if (threads.length === 0) {
            await loadThreads();
          }
          
          // Re-check after loading threads
          const { threads: updatedThreads } = useChatStore.getState();
          const threadExists = updatedThreads.some(thread => thread.id === threadId);
          
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
  }, [threadId, startConversation, user]);
};
