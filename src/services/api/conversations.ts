// src/services/api/conversations.ts
import { supabase } from '@/integrations/supabase/client';
import { Conversation } from '@/core/types';
import { getGuestId } from '../auth/session';

// Legacy function - now replaced by secure token-based getOrCreateConversation
// Keeping for backward compatibility but should not be used for new chat flows
export const createConversation = async (reportId?: string): Promise<Conversation> => {
  const guestId = getGuestId();
  console.log('[createConversation] DEPRECATED: Called with reportId:', reportId, 'using guestId from session:', guestId);
  console.warn('[createConversation] This function is deprecated. Use getOrCreateConversation with secure tokens instead.');
  
  // FAIL FAST: If no guestId, don't create a fallback
  if (!guestId) {
    console.error('[createConversation] FAIL FAST: No guestId available');
    throw new Error('guestId is required for conversation creation');
  }
  
  // Log the exact values being inserted
  const insertData = { report_id: reportId, guest_id: guestId };
  console.log('[createConversation] INSERT data:', JSON.stringify(insertData));
  
  const { data, error } = await supabase
    .from('conversations')
    .insert(insertData)
    .select()
    .single();

  // Log the complete response
  console.log('[createConversation] Supabase response:', {
    status: error ? 'error' : 'success',
    data: data ? { id: data.id, guest_id: data.guest_id, report_id: data.report_id } : null,
    error: error ? { code: error.code, message: error.message, details: error.details } : null
  });

  if (error) {
    console.error('[createConversation] Database error:', error);
    throw new Error(error.message);
  }
  
  console.log('[createConversation] Created conversation:', data.id, 'with guestId:', guestId);
  return { ...data, messages: [] };
};

export const getConversationByReportId = async (reportId: string): Promise<Conversation | null> => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      messages (*)
    `)
    .eq('report_id', reportId)
    .order('created_at', { foreignTable: 'messages', ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Conversation | null;
};

export const listConversations = async (): Promise<Partial<Conversation>[]> => {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, created_at, updated_at, meta')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

export const getOrCreateConversation = async (uuid: string): Promise<{ conversationId: string }> => {

  
  // FAIL FAST: Validate inputs
  if (!uuid) {
    console.error('[getOrCreateConversation] FAIL FAST: uuid is required');
    throw new Error('uuid is required for conversation creation');
  }
  
  // Try to find existing conversation by uuid (which maps to guest_id in our system)
  const { data: existing, error: fetchError } = await supabase
    .from('conversations')
    .select('id')
    .eq('guest_id', uuid)
    .limit(1)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  if (existing) {
    return { conversationId: existing.id };
  }

  // Create new conversation
  console.log('[getOrCreateConversation] Creating new conversation with uuid:', uuid);
  
  // Log the exact values being inserted - report_id is nullable now since we get report details from retrieve-temp-report
  const insertData = { guest_id: uuid }; 
  console.log('[getOrCreateConversation] INSERT data:', JSON.stringify(insertData));
  
  const { data: newConv, error: createError } = await supabase
    .from('conversations')
    .insert(insertData)
    .select('id')
    .single();

  // Log the complete response
  console.log('[getOrCreateConversation] Supabase response:', {
    status: createError ? 'error' : 'success',
    data: newConv ? { id: newConv.id } : null,
    error: createError ? { code: createError.code, message: createError.message, details: createError.details } : null
  });

  if (createError) {
    console.error('[getOrCreateConversation] Database error:', createError);
    throw new Error(createError.message);
  }
  
  console.log('[getOrCreateConversation] Created new conversation:', newConv.id);

  return { conversationId: newConv.id };
};

// Frontend-side context injection removed; backend handles context on first turn
