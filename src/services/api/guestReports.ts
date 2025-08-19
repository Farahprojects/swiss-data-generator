// src/services/api/guestReports.ts
import { supabase } from '@/integrations/supabase/client';

export interface GuestReportVerification {
  guestId: string;
  chat_id: string;
  isValid: boolean;
}

/**
 * Verify guest exists in Guest Reports table and get their chat_id
 */
export const verifyGuestAndGetChatId = async (guestId: string): Promise<GuestReportVerification> => {
  console.log('[verifyGuestAndGetChatId] Verifying guest:', guestId);
  
  if (!guestId) {
    console.error('[verifyGuestAndGetChatId] No guestId provided');
    return { guestId: '', chat_id: '', isValid: false };
  }

  try {
    const { data: guestReport, error } = await supabase
      .from('guest_reports')
      .select('id, chat_id')
      .eq('id', guestId)
      .single();

    if (error) {
      console.error('[verifyGuestAndGetChatId] Database error:', error);
      return { guestId, chat_id: '', isValid: false };
    }

    if (!guestReport) {
      console.warn('[verifyGuestAndGetChatId] No guest report found for:', guestId);
      return { guestId, chat_id: '', isValid: false };
    }

    if (!guestReport.chat_id) {
      console.warn('[verifyGuestAndGetChatId] Guest report has no chat_id:', guestId);
      return { guestId, chat_id: '', isValid: false };
    }

    console.log('[verifyGuestAndGetChatId] Successfully verified guest:', guestId, 'with chat_id:', guestReport.chat_id);
    
    return {
      guestId,
      chat_id: guestReport.chat_id,
      isValid: true
    };

  } catch (error) {
    console.error('[verifyGuestAndGetChatId] Unexpected error:', error);
    return { guestId, chat_id: '', isValid: false };
  }
};

/**
 * Get chat_id for a verified guest
 */
export const getChatIdForGuest = async (guestId: string): Promise<string | null> => {
  const verification = await verifyGuestAndGetChatId(guestId);
  return verification.isValid ? verification.chat_id : null;
};

/**
 * Verify that a persisted chat_id is still valid and belongs to the correct guest
 */
export const verifyChatIdIntegrity = async (chat_id: string): Promise<{ isValid: boolean; guestId?: string }> => {
  console.log('[verifyChatIdIntegrity] Verifying persisted chat_id:', chat_id);
  
  if (!chat_id) {
    console.warn('[verifyChatIdIntegrity] No chat_id provided for verification');
    return { isValid: false };
  }

  try {
    const { data: guestReport, error } = await supabase
      .from('guest_reports')
      .select('id, chat_id')
      .eq('chat_id', chat_id)
      .single();

    if (error) {
      console.error('[verifyChatIdIntegrity] Database error during verification:', error);
      return { isValid: false };
    }

    if (!guestReport) {
      console.warn('[verifyChatIdIntegrity] No guest report found for chat_id:', chat_id, '- possible tampering detected');
      return { isValid: false };
    }

    console.log('[verifyChatIdIntegrity] ✅ chat_id verified successfully for guest:', guestReport.id);
    return { 
      isValid: true, 
      guestId: guestReport.id 
    };

  } catch (error) {
    console.error('[verifyChatIdIntegrity] Unexpected error during verification:', error);
    return { isValid: false };
  }
};
