import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useChatStore } from '@/core/store';
import { chatController } from '@/features/chat/ChatController';
import { useAuth } from '@/contexts/AuthContext';
import { getLastChatId } from '@/services/auth/chatTokens';

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
  const { threadId, chatId } = useParams<{ threadId?: string; chatId?: string }>();
  const routeChatId = threadId || chatId;
  const { chat_id, startConversation } = useChatStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
    // Handle direct URL navigation for both /c/:threadId and /join/:chatId
    if (routeChatId && routeChatId !== "1") {
      // Load the chat directly - let the message store handle validation
      const loadThread = async () => {
        try {
          // Use the same direct flow as handleSwitchToChat
          const { useMessageStore } = await import('@/stores/messageStore');
          useMessageStore.getState().setChatId(routeChatId);
          startConversation(routeChatId);
          await chatController.switchToChat(routeChatId);
        } catch (error) {
          console.error('[useChatInitialization] Error loading thread:', error);
          useChatStore.getState().clearChat();
        }
      };
      
      loadThread();
    } else if (routeChatId === "1") {
      useChatStore.getState().clearChat();
    }
  }, [routeChatId, startConversation]);

  // Smart navigation: redirect to last chat when visiting root URLs
  useEffect(() => {
    if (!threadId && user) {
      const redirectToLastChat = async () => {
        try {
          // Check if we're on a root URL that should redirect
          const isRootUrl = location.pathname === '/' || location.pathname === '/therai';
          
          if (isRootUrl) {
            const { chatId } = getLastChatId();
            
            if (chatId) {
              // Validate the chat exists in current threads
              const { threads, isLoadingThreads } = useChatStore.getState();
              
              // Wait for threads to load if they're still loading
              if (isLoadingThreads) {
                // Set up a listener to wait for threads to finish loading
                const checkThreadsLoaded = () => {
                  const currentState = useChatStore.getState();
                  if (!currentState.isLoadingThreads) {
                    const threadExists = currentState.threads.some(thread => thread.id === chatId);
                    if (threadExists) {
                      // Redirect to the last chat
                      navigate(`/chat/${chatId}`, { replace: true });
                    }
                  }
                };
                
                // Check immediately and set up a small delay to catch the state change
                setTimeout(checkThreadsLoaded, 100);
              } else {
                const threadExists = threads.some(thread => thread.id === chatId);
                if (threadExists) {
                  // Redirect to the last chat
                  navigate(`/chat/${chatId}`, { replace: true });
                }
              }
            }
          }
        } catch (error) {
          console.error('[useChatInitialization] Error redirecting to last chat:', error);
        }
      };

      redirectToLastChat();
    }
  }, [threadId, user, location.pathname, navigate]);
};
