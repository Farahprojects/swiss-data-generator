import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '@/core/store';
import { chatController } from '@/features/chat/ChatController';
import { useAuth } from '@/contexts/AuthContext';
import { useUserType } from '@/hooks/useUserType';
import { usePaymentFlowStore } from '@/stores/paymentFlowStore';

/**
 * Centralized chat initialization hook with hydration
 * Single responsibility: Initialize chat with proper hydration order
 * 
 * Architecture:
 * - Store hydrates from: sessionStorage → URL → backend
 * - Store is single authority, UI always reads from store
 * - Payment gate: Can skip initialization if payment is pending
 */
export const useChatInitialization = (options?: { skipIfPaymentPending?: boolean }) => {
  const { threadId } = useParams<{ threadId?: string }>();
  const { chat_id, hydrateFromStorage, startConversation } = useChatStore();
  const { user } = useAuth();
  const { guestId } = useUserType();
  const { isPaymentConfirmed, isReportReady, error: paymentError } = usePaymentFlowStore();
  const [isPaymentGateActive, setIsPaymentGateActive] = useState(false);
  
  // Payment gate for guest routes
  useEffect(() => {
    if (!threadId) return;

    // Only apply payment gate to guest routes (/c/g/{threadId})
    const isGuestRoute = window.location.pathname.startsWith('/c/g/');
    if (!isGuestRoute) {
      console.log(`[useChatInitialization] Not a guest route, skipping payment gate`);
      setIsPaymentGateActive(false);
      return;
    }

    // Wait for full report readiness before unlocking chat init (prevents messages WS overlap)
    if (isReportReady) {
      setIsPaymentGateActive(false);
    } else if (paymentError) {
      setIsPaymentGateActive(false);
    } else {
      setIsPaymentGateActive(true);
    }
  }, [threadId, isPaymentConfirmed, isReportReady, paymentError]);

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
    
    // 3. Start conversation in store if needed (always set chat_id early)
    if (targetChatId && targetChatId !== chat_id) {
      startConversation(targetChatId, guestId);
    }

    // 4. Initialize controller (messages WS) only when allowed
    const isGuestRoute = window.location.pathname.startsWith('/c/g/');
    const readyToInit = targetChatId && (!isGuestRoute || isReportReady || paymentError);
    if (readyToInit && targetChatId !== undefined) {
      chatController.initializeForConversation(targetChatId as string);
    }
  }, [threadId, chat_id, hydrateFromStorage, startConversation, user?.id, guestId, isReportReady, paymentError]);
};
