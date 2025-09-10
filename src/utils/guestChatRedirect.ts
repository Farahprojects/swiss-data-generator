/**
 * ✅ GUEST CHAT INTEGRATION UTILITY
 * 
 * Handles the integration when external systems (like innate-report-flow) 
 * provide guest_id and chat_id to the frontend. Ensures proper navigation 
 * to the /c path with the correct thread loading.
 */

import { useChatStore } from '@/core/store';
import { STORAGE_KEYS } from '@/utils/storageKeys';

export interface GuestChatData {
  guest_id: string;
  chat_id: string;
  payment_completed?: boolean;
}

/**
 * Primary integration point for external systems providing guest chat data
 * This function handles the complete flow from external data to /c/:threadId
 */
export const redirectToGuestChat = (data: GuestChatData): string => {
  const { guest_id, chat_id, payment_completed = false } = data;
  
  console.log(`[GuestChatRedirect] Initiating redirect for guest ${guest_id} to chat ${chat_id}`);
  
  // 1. Store guest_id in persistent storage (for /c to pick up)
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEYS.CHAT.GUEST.REPORT_ID, guest_id);
    sessionStorage.setItem(STORAGE_KEYS.CHAT.GUEST.CHAT_ID, chat_id);
    
    if (payment_completed) {
      sessionStorage.setItem(STORAGE_KEYS.CHAT.GUEST.PAYMENT_STATUS, 'completed');
    }
  }
  
  // 2. Hydrate store immediately for smooth UX
  try {
    const store = useChatStore.getState();
    store.setGuestId(guest_id);
    store.startConversation(chat_id, guest_id);
    console.log(`[GuestChatRedirect] Store hydrated with guest_id: ${guest_id}, chat_id: ${chat_id}`);
  } catch (error) {
    console.error('[GuestChatRedirect] Failed to hydrate store:', error);
  }
  
  // 3. Return the clean /c/:threadId URL (chat_id becomes threadId)
  const targetUrl = `/c/${chat_id}`;
  console.log(`[GuestChatRedirect] Target URL: ${targetUrl}`);
  
  return targetUrl;
};

/**
 * Alternative integration for URL-based data
 * Extracts guest_id and chat_id from URL parameters and redirects to /c
 */
export const handleGuestChatFromUrl = (searchParams: URLSearchParams): string | null => {
  const guest_id = searchParams.get('guest_id');
  const chat_id = searchParams.get('chat_id');
  const payment_completed = searchParams.get('payment_completed') === 'true';
  
  if (!guest_id || !chat_id) {
    console.log('[GuestChatRedirect] Missing guest_id or chat_id in URL parameters');
    return null;
  }
  
  console.log(`[GuestChatRedirect] Processing URL-based guest chat data: guest_id=${guest_id}, chat_id=${chat_id}`);
  
  return redirectToGuestChat({ guest_id, chat_id, payment_completed });
};

/**
 * Recovery function for when guest is on /c but missing session data
 * Attempts to restore from storage or URL
 */
export const recoverGuestSession = (): { guest_id: string; chat_id: string } | null => {
  if (typeof window === 'undefined') return null;
  
  // Try to get from storage first
  const storedGuestId = sessionStorage.getItem(STORAGE_KEYS.CHAT.GUEST.REPORT_ID);
  const storedChatId = sessionStorage.getItem(STORAGE_KEYS.CHAT.GUEST.CHAT_ID);
  
  if (storedGuestId && storedChatId) {
    console.log(`[GuestChatRedirect] Recovered session from storage: guest_id=${storedGuestId}, chat_id=${storedChatId}`);
    return { guest_id: storedGuestId, chat_id: storedChatId };
  }
  
  // Try URL parameters as fallback
  const urlParams = new URLSearchParams(window.location.search);
  const urlGuestId = urlParams.get('guest_id');
  const urlChatId = urlParams.get('chat_id');
  
  if (urlGuestId && urlChatId) {
    console.log(`[GuestChatRedirect] Recovered session from URL: guest_id=${urlGuestId}, chat_id=${urlChatId}`);
    
    // Store for future use
    sessionStorage.setItem(STORAGE_KEYS.CHAT.GUEST.REPORT_ID, urlGuestId);
    sessionStorage.setItem(STORAGE_KEYS.CHAT.GUEST.CHAT_ID, urlChatId);
    
    return { guest_id: urlGuestId, chat_id: urlChatId };
  }
  
  console.log('[GuestChatRedirect] No guest session data found');
  return null;
};