import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '@/core/store';
import { chatController } from '@/features/chat/ChatController';
import { useAuth } from '@/contexts/AuthContext';
import { useUserType } from '@/hooks/useUserType';

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
  const { chat_id, startConversation, loadThreads } = useChatStore();
  const { user } = useAuth();
  const { guestId } = useUserType();

  useEffect(() => {
    // Initialize WebSocket callbacks once on app startup
    const initializeWebSocket = async () => {
      console.log('[useChatInitialization] Initializing WebSocket callbacks once');
      await chatController.initializeWebSocketCallbacks();
    };
    
    initializeWebSocket();

    // Load threads from DB (source of truth)
    if (user) {
      console.log('[useChatInitialization] Loading threads from DB');
      loadThreads();
    }
  }, [user, loadThreads]);

  useEffect(() => {
    // Handle direct URL navigation (typing /c/123 in browser)
    if (threadId && threadId !== "1") {
      console.log('[useChatInitialization] Direct URL navigation detected:', threadId);
      
      // Validate threadId exists in DB before using it
      const validateAndLoadThread = async () => {
        try {
          // Check if this thread exists in our loaded threads
          const { threads } = useChatStore.getState();
          const threadExists = threads.some(thread => thread.id === threadId);
          
          if (threadExists) {
            console.log('[useChatInitialization] Thread exists, loading directly');
            // Use the same direct flow as handleSwitchToChat
            const { useMessageStore } = await import('@/stores/messageStore');
            useMessageStore.getState().setChatId(threadId);
            startConversation(threadId, guestId);
            await chatController.switchToChat(threadId);
          } else {
            console.log('[useChatInitialization] Thread not found in DB, clearing');
            useChatStore.getState().clearChat();
          }
        } catch (error) {
          console.error('[useChatInitialization] Error validating thread:', error);
          useChatStore.getState().clearChat();
        }
      };
      
      validateAndLoadThread();
    } else if (threadId === "1") {
      console.error('[useChatInitialization] BLOCKED: Invalid threadId "1" detected');
      useChatStore.getState().clearChat();
    }
  }, [threadId, startConversation, guestId]);
};
