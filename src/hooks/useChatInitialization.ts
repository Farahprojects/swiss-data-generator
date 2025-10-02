import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize WebSocket callbacks once on app startup
    const initializeWebSocket = async () => {
      await chatController.initializeWebSocketCallbacks();
    };
    
    initializeWebSocket();

    // Load threads when user signs in (useChatStore needs this for ChatThreadsSidebar)
    if (user) {
      const { loadThreads, reconcileInsightThreads } = useChatStore.getState();
      loadThreads(); // Initial load on page refresh/mount
      
      // Reconcile insights - create missing chat threads for completed insights
      reconcileInsightThreads(user.id);
      
      // No persistence - always start fresh from URL
    }
  }, [user]);

  useEffect(() => {
    // Handle direct URL navigation (typing /c/123 in browser)
    if (threadId && threadId !== "1" && user) {
      // Validate threadId exists in DB before using it
      const validateAndLoadThread = async () => {
        try {
          // Check if thread exists in current threads
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
  }, [threadId, startConversation, user]);

  // Auto-load most recent conversation when no threadId is provided
  useEffect(() => {
    if (!threadId && user) {
      const autoLoadMostRecentConversation = async () => {
        try {
          const { threads, isLoadingThreads } = useChatStore.getState();
          
          // Wait for threads to load if they're still loading
          if (isLoadingThreads) {
            // Set up a listener to wait for threads to finish loading
            const checkThreadsLoaded = () => {
              const currentState = useChatStore.getState();
              if (!currentState.isLoadingThreads && currentState.threads.length > 0) {
                // Load the most recent conversation (first in the sorted array)
                const mostRecentThread = currentState.threads[0];
                loadConversation(mostRecentThread.id);
              } else if (!currentState.isLoadingThreads && currentState.threads.length === 0) {
                // No conversations exist, stay on empty state
                console.log('[useChatInitialization] No conversations found, staying on empty state');
              }
            };
            
            // Check immediately and set up a small delay to catch the state change
            setTimeout(checkThreadsLoaded, 100);
          } else if (threads.length > 0) {
            // Threads are already loaded, load the most recent one
            const mostRecentThread = threads[0];
            loadConversation(mostRecentThread.id);
          }
        } catch (error) {
          console.error('[useChatInitialization] Error auto-loading most recent conversation:', error);
        }
      };

      const loadConversation = async (conversationId: string) => {
        try {
          // Use the same direct flow as handleSwitchToChat
          const { useMessageStore } = await import('@/stores/messageStore');
          useMessageStore.getState().setChatId(conversationId);
          startConversation(conversationId);
          await chatController.switchToChat(conversationId);
          
          // Update URL to reflect the loaded conversation
          navigate(`/chat/${conversationId}`, { replace: true });
        } catch (error) {
          console.error('[useChatInitialization] Error loading conversation:', error);
        }
      };

      autoLoadMostRecentConversation();
    }
  }, [threadId, user, startConversation]);
};
