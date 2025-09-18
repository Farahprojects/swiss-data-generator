import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '@/core/store';
import { chatController } from '@/features/chat/ChatController';
import { useAuth } from '@/contexts/AuthContext';
import { useUserType } from '@/hooks/useUserType';

/**
 * Centralized chat initialization hook with hydration
 * Single responsibility: Initialize chat with proper hydration order
 * 
 * Architecture:
 * - Store hydrates from: sessionStorage → URL → backend
 * - Store is single authority, UI always reads from store
 */
export const useChatInitialization = () => {
  const { threadId } = useParams<{ threadId?: string }>();
  const { chat_id, hydrateFromStorage, startConversation } = useChatStore();
  const { user } = useAuth();
  const { guestId } = useUserType();

  useEffect(() => {
    // Extra safety: Check URL params for chat_id
    const urlParams = new URLSearchParams(window.location.search);
    const urlChatId = urlParams.get('chat_id');
    
    // Double-safety: ensure we never hydrate a deleted session
    if (!threadId && !urlChatId) {
      // Reset store to guarantee clean state
      useChatStore.getState().clearChat();
      return;
    }
    
    // Hydration order: URL → sessionStorage → fresh start
    let targetChatId = chat_id;
    
    // 1. URL threadId is primary source of truth
    if (!targetChatId && threadId) {
      targetChatId = threadId;
    }
    
    // 2. Fallback to sessionStorage cache
    if (!targetChatId) {
      const hydratedChatId = hydrateFromStorage(user?.id, guestId);
      if (hydratedChatId) {
        targetChatId = hydratedChatId;
      }
    }
    
    // 3. Start conversation in store if needed
    if (targetChatId && targetChatId !== chat_id) {
      startConversation(targetChatId, guestId);
    }

    // 4. Initialize controller (messages WS) immediately
    if (targetChatId) {
      chatController.initializeForConversation(targetChatId);
    }
  }, [threadId, chat_id, hydrateFromStorage, startConversation, user?.id, guestId]);
};
