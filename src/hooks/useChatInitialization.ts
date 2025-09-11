import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '@/core/store';
import { chatController } from '@/features/chat/ChatController';
import { useAuth } from '@/contexts/AuthContext';
import { useUserType } from '@/hooks/useUserType';
import { supabase } from '@/integrations/supabase/client';

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
  const { chat_id, hydrateFromStorage, startConversation, setChatLocked } = useChatStore();
  const { user } = useAuth();
  const { guestId } = useUserType();
  const [isPaymentGateActive, setIsPaymentGateActive] = useState(false);
  
  // Payment gate for guest routes
  useEffect(() => {
    if (!threadId) return;

    // Only apply payment gate to guest routes (/c/g/{threadId})
    const isGuestRoute = window.location.pathname.startsWith('/c/g/');
    if (!isGuestRoute) {
      console.log(`[useChatInitialization] Not a guest route, skipping payment gate`);
      setIsPaymentGateActive(false);
      setChatLocked(false);
      return;
    }

    const checkPaymentStatus = async () => {
      try {
        console.log(`[useChatInitialization] Checking payment status for guest threadId: ${threadId}`);
        
        const { data: guestReport, error } = await supabase
          .from('guest_reports')
          .select('payment_status')
          .eq('id', threadId)
          .single();

        if (error) {
          console.error(`[useChatInitialization] Error fetching payment status:`, error);
          setIsPaymentGateActive(false);
          setChatLocked(false);
          return;
        }

        console.log(`[useChatInitialization] Payment status: ${guestReport.payment_status}`);

        if (guestReport.payment_status === 'paid') {
          console.log(`[useChatInitialization] Payment confirmed - unlocking chat`);
          setIsPaymentGateActive(false);
          setChatLocked(false);
        } else {
          console.log(`[useChatInitialization] Payment pending - locking chat`);
          setIsPaymentGateActive(true);
          setChatLocked(true);
        }
      } catch (error) {
        console.error(`[useChatInitialization] Error in payment status check:`, error);
        setIsPaymentGateActive(false);
        setChatLocked(false);
      }
    };

    checkPaymentStatus();
  }, [threadId, setChatLocked]);

  useEffect(() => {
    // Payment gate: Skip initialization if payment is pending
    if (isPaymentGateActive) {
      console.log(`[useChatInitialization] Payment gate active - skipping chat initialization`);
      return;
    }

    // Extra safety: Check URL params for chat_id
    const urlParams = new URLSearchParams(window.location.search);
    const urlChatId = urlParams.get('chat_id');
    
    // Double-safety: ensure we never hydrate a deleted session
    if (!threadId && !urlChatId) {
      console.log(`[useChatInitialization] No threadId or chat_id in URL - ensuring clean state`);
      // Reset store to guarantee clean state
      useChatStore.getState().clearChat();
      return;
    }
    
    // Hydration order: sessionStorage → URL → backend
    let targetChatId = chat_id;
    
    // 1. Try to hydrate from sessionStorage first (fastest)
    if (!targetChatId) {
      const hydratedChatId = hydrateFromStorage(user?.id, guestId);
      if (hydratedChatId) {
        targetChatId = hydratedChatId;
        console.log(`[useChatInitialization] Hydrated from sessionStorage: ${targetChatId}`);
      }
    }
    
    // 2. Fallback to URL threadId
    if (!targetChatId && threadId) {
      targetChatId = threadId;
      console.log(`[useChatInitialization] Using URL threadId: ${targetChatId}`);
    }
    
    // 3. Initialize if we have a chat_id and it's different from current
    if (targetChatId && targetChatId !== chat_id) {
      console.log(`[useChatInitialization] Initializing chat: ${targetChatId}`);
      
      // Set in store first (this will persist to sessionStorage)
      startConversation(targetChatId, guestId);
      
      // Then initialize controller
      chatController.initializeForConversation(targetChatId);
    }
  }, [threadId, chat_id, hydrateFromStorage, startConversation, user?.id, guestId, isPaymentGateActive]);
};
