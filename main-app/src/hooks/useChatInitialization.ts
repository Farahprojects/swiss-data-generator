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
    
    // CRITICAL: Clear any invalid cached chat_id values (like "1")
    if (threadId && threadId !== "1") {
      // Clear any cached "1" values that might be causing issues
      sessionStorage.removeItem('therai_active_chat_shared');
      sessionStorage.removeItem('therai_active_chat_auth_');
      sessionStorage.removeItem('therai_active_chat_guest_');
    }
    
    // Hydration order: URL → sessionStorage → fresh start
    let targetChatId = chat_id;
    
    console.log('[useChatInitialization] Starting hydration:', {
      currentChatId: chat_id,
      threadId,
      userId: user?.id,
      guestId
    });
    
    // 1. URL threadId is primary source of truth
    if (!targetChatId && threadId) {
      targetChatId = threadId;
      console.log('[useChatInitialization] Using URL threadId:', targetChatId);
    }
    
    // 2. Fallback to sessionStorage cache
    if (!targetChatId) {
      const hydratedChatId = hydrateFromStorage(user?.id, guestId);
      if (hydratedChatId) {
        targetChatId = hydratedChatId;
        console.log('[useChatInitialization] Using hydrated chatId:', targetChatId);
      }
    }
    
    // 3. Start conversation in store if needed
    if (targetChatId && targetChatId !== chat_id && targetChatId !== "1") {
      console.log('[useChatInitialization] Starting conversation with chat_id:', targetChatId);
      startConversation(targetChatId, guestId);
    }

    // 4. Initialize controller (messages WS) immediately
    if (targetChatId && targetChatId !== "1") {
      console.log('[useChatInitialization] Initializing controller with chat_id:', targetChatId);
      chatController.initializeForConversation(targetChatId);
    } else if (targetChatId === "1") {
      console.error('[useChatInitialization] BLOCKED: Invalid chat_id "1" detected, clearing store');
      useChatStore.getState().clearChat();
    }
  }, [threadId, chat_id, hydrateFromStorage, startConversation, user?.id, guestId]);
};
