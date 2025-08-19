// src/services/api/guestReports.ts
import { supabase } from '@/integrations/supabase/client';

export interface ChatAccessVerification {
  valid: boolean;
  chat_id?: string;
  guest_id?: string;
  reason?: string;
  message?: string;
}

/**
 * Securely verify chat access using edge function
 * Supports both chat_id verification (tampering check) and guest_id lookup
 */
export const verifyChatAccess = async (params: { chat_id?: string; guest_id?: string }): Promise<ChatAccessVerification> => {
  console.log('[verifyChatAccess] Verifying access with:', params);
  
  if (!params.chat_id && !params.guest_id) {
    console.error('[verifyChatAccess] No chat_id or guest_id provided');
    return { valid: false, reason: 'missing_params', message: 'No parameters provided' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('verify-chat-access', {
      body: params,
    });

    if (error) {
      console.error('[verifyChatAccess] Edge function error:', error);
      return { valid: false, reason: 'function_error', message: error.message };
    }

    console.log('[verifyChatAccess] Edge function response:', data);
    return data as ChatAccessVerification;

  } catch (error) {
    console.error('[verifyChatAccess] Unexpected error:', error);
    return { valid: false, reason: 'network_error', message: 'Network or parsing error' };
  }
};

/**
 * Get chat_id for a verified guest (secure)
 */
export const getChatIdForGuest = async (guestId: string): Promise<string | null> => {
  console.log('[getChatIdForGuest] Getting chat_id for guest:', guestId);
  
  const result = await verifyChatAccess({ guest_id: guestId });
  
  if (result.valid && result.chat_id) {
    console.log('[getChatIdForGuest] ✅ Successfully got chat_id:', result.chat_id);
    return result.chat_id;
  } else {
    console.warn('[getChatIdForGuest] ❌ Failed to get chat_id:', result.reason);
    return null;
  }
};

/**
 * Verify that a persisted chat_id is still valid (secure)
 */
export const verifyChatIdIntegrity = async (chat_id: string): Promise<{ isValid: boolean; guestId?: string }> => {
  console.log('[verifyChatIdIntegrity] Verifying chat_id integrity:', chat_id);
  
  const result = await verifyChatAccess({ chat_id });
  
  if (result.valid && result.guest_id) {
    console.log('[verifyChatIdIntegrity] ✅ chat_id verified for guest:', result.guest_id);
    return { isValid: true, guestId: result.guest_id };
  } else {
    console.warn('[verifyChatIdIntegrity] ❌ chat_id verification failed:', result.reason);
    return { isValid: false };
  }
};
