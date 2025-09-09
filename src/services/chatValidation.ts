import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';
import { STORAGE_KEYS } from '@/utils/storageKeys';

interface ChatValidationResult {
  isValid: boolean;
  chat_id?: string;
  guest_id?: string;
  reason?: string;
}

/**
 * Validates and initializes chat session for both auth and guest users
 * This is the orchestrator that determines which flow to use
 */
export class ChatValidator {
  
  /**
   * Validate guest user access and get their chat_id
   */
  static async validateGuestAccess(guest_id: string): Promise<ChatValidationResult> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-chat-access', {
        body: { guest_id }
      });

      if (error || !data?.valid) {
        return { 
          isValid: false, 
          reason: data?.reason || 'Guest access validation failed' 
        };
      }

      return {
        isValid: true,
        chat_id: data.chat_id,
        guest_id: data.guest_id
      };
    } catch (error) {
      console.error('[ChatValidator] Guest validation error:', error);
      return { 
        isValid: false, 
        reason: 'Network error during guest validation' 
      };
    }
  }

  /**
   * Validate auth user conversation access
   */
  static async validateAuthAccess(chat_id: string, user_id: string): Promise<ChatValidationResult> {
    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('id, user_id')
        .eq('id', chat_id)
        .eq('user_id', user_id)
        .single();

      if (error || !conversation) {
        return { 
          isValid: false, 
          reason: 'Conversation not found or access denied' 
        };
      }

      return {
        isValid: true,
        chat_id: conversation.id
      };
    } catch (error) {
      console.error('[ChatValidator] Auth validation error:', error);
      return { 
        isValid: false, 
        reason: 'Network error during auth validation' 
      };
    }
  }

  /**
   * Initialize chat session for guest user
   */
  static async initializeGuestChat(guest_id: string): Promise<boolean> {
    const validation = await this.validateGuestAccess(guest_id);
    
    if (!validation.isValid || !validation.chat_id) {
      console.error('[ChatValidator] Guest chat initialization failed:', validation.reason);
      return false;
    }

    // Initialize store with guest data
    const store = useChatStore.getState();
    store.startConversation(validation.chat_id, validation.guest_id);
    store.setGuestId(validation.guest_id!);

    console.log('[ChatValidator] Guest chat initialized:', {
      chat_id: validation.chat_id,
      guest_id: validation.guest_id
    });

    return true;
  }

  /**
   * Initialize chat session for auth user
   */
  static async initializeAuthChat(chat_id: string, user_id: string): Promise<boolean> {
    const validation = await this.validateAuthAccess(chat_id, user_id);
    
    if (!validation.isValid || !validation.chat_id) {
      console.error('[ChatValidator] Auth chat initialization failed:', validation.reason);
      return false;
    }

    // Initialize store with auth data
    const store = useChatStore.getState();
    store.startConversation(validation.chat_id);

    console.log('[ChatValidator] Auth chat initialized:', {
      chat_id: validation.chat_id,
      user_id
    });

    return true;
  }

  /**
   * Create new conversation for auth user
   */
  static async createNewAuthConversation(user_id: string): Promise<string | null> {
    try {
      const store = useChatStore.getState();
      const conversation_id = await store.startNewConversation(user_id);
      
      console.log('[ChatValidator] New auth conversation created:', conversation_id);
      return conversation_id;
    } catch (error) {
      console.error('[ChatValidator] Failed to create auth conversation:', error);
      return null;
    }
  }

  /**
   * Main orchestrator - determines and initializes appropriate chat flow
   */
  static async initializeChat(params: {
    chat_id?: string;
    user_id?: string;
    guest_id?: string;
  }): Promise<{ success: boolean; chat_id?: string; reason?: string }> {
    
    const { chat_id, user_id, guest_id } = params;

    // Priority 1: Auth user with existing chat
    if (user_id && chat_id) {
      const success = await this.initializeAuthChat(chat_id, user_id);
      return success 
        ? { success: true, chat_id }
        : { success: false, reason: 'Auth chat initialization failed' };
    }

    // Priority 2: Guest user 
    if (guest_id) {
      const success = await this.initializeGuestChat(guest_id);
      const store = useChatStore.getState();
      return success 
        ? { success: true, chat_id: store.chat_id || undefined }
        : { success: false, reason: 'Guest chat initialization failed' };
    }

    // Priority 3: Auth user creating new conversation
    if (user_id && !chat_id) {
      const newChatId = await this.createNewAuthConversation(user_id);
      return newChatId 
        ? { success: true, chat_id: newChatId }
        : { success: false, reason: 'Failed to create new conversation' };
    }

    // Priority 4: Unauthenticated user (no session)
    return { success: false, reason: 'No valid authentication or guest credentials' };
  }

  /**
   * Get guest_id from storage
   */
  static getGuestIdFromStorage(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(STORAGE_KEYS.CHAT.GUEST.REPORT_ID);
  }

  /**
   * Detect current session type and restore if needed
   */
  static async restoreSession(): Promise<{ success: boolean; type?: 'auth' | 'guest' | 'none' }> {
    const guest_id = this.getGuestIdFromStorage();
    
    // Try to restore guest session
    if (guest_id) {
      const success = await this.initializeGuestChat(guest_id);
      return { success, type: success ? 'guest' : 'none' };
    }

    // For auth users, the auth context will handle restoration
    return { success: false, type: 'none' };
  }
}