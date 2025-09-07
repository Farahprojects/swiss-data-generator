/**
 * 🧹 STREAMLINED SESSION RESET - URL & Store Focus Only
 * 
 * Simple, focused session cleanup for the new URL-based flow.
 * Only resets what's needed for a clean chat page experience.
 */

import { useChatStore } from '@/core/store';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import { clearChatTokens } from '@/services/auth/chatTokens';

export interface StreamlinedResetOptions {
  redirectTo?: string;
  preserveNavigation?: boolean;
}

/**
 * Streamlined session reset - focuses only on URL and store cleanup
 * Does NOT touch other app parts that have their own cleanup
 */
export const streamlinedSessionReset = async (options: StreamlinedResetOptions = {}): Promise<void> => {
  const { redirectTo = '/', preserveNavigation = false } = options;
  
  
  try {
    // 1. Clear Chat Store (messages, chat_id, guest_id, etc.)
    const { clearChat } = useChatStore.getState();
    clearChat();
    
    // 2. Clear Conversation UI Store
    const { closeConversation } = useConversationUIStore.getState();
    closeConversation();
    
    // 3. Clear Report Ready Store
    const { setErrorState, stopPolling } = useReportReadyStore.getState();
    setErrorState(null);
    stopPolling();
    
    // 4. Clear Chat Tokens
    clearChatTokens();
    
    // 5. Clear Essential Session Storage (chat-specific only)
    const chatStorageKeys = [
      'therai_chat_id',           // Chat session ID
      'report_generation_status', // Report generation state
      'therai_chat_uuid',         // Chat UUID
      'therai_chat_token',        // Chat token
      'therai_conversation_id',   // Conversation ID
      'therai_report_ready',      // Report ready state
    ];
    
    chatStorageKeys.forEach(key => {
      try {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`[StreamlinedReset] Could not clear ${key}:`, error);
      }
    });
    
    // 6. Clear URL Parameters (clean slate)
    if (!preserveNavigation) {
      const cleanUrl = new URL(window.location.origin + redirectTo);
      window.history.replaceState({}, '', cleanUrl.toString());
    }
    
    
    // 7. Navigate if requested
    if (!preserveNavigation && redirectTo !== window.location.pathname) {
      window.location.href = redirectTo;
    }
    
  } catch (error) {
    console.error('❌ [StreamlinedReset] Error during cleanup:', error);
    // Fallback: Force navigation anyway
    if (!preserveNavigation) {
      window.location.href = redirectTo;
    }
  }
};

/**
 * Quick reset for just the chat page (no navigation)
 */
export const resetChatPage = async (): Promise<void> => {
  await streamlinedSessionReset({ preserveNavigation: true });
};
