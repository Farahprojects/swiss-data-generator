// src/services/api/conversations.ts
import { supabase } from '@/integrations/supabase/client';
import { Conversation } from '@/core/types';
import { getGuestId } from '../auth/session';

export const createConversation = async (reportId?: string): Promise<Conversation> => {
  const guestId = getGuestId();
  console.log('[createConversation] Called with reportId:', reportId, 'using guestId from session:', guestId);
  const { data, error } = await supabase
    .from('conversations')
    .insert({ report_id: reportId, guest_id: guestId })
    .select()
    .single();

  if (error) throw new Error(error.message);
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

export const getOrCreateConversation = async (guestId: string, reportId: string): Promise<{ conversationId: string }> => {
  console.log('[getOrCreateConversation] Called with guestId:', guestId, 'reportId:', reportId);
  
  // Try to find existing conversation
  const { data: existing, error: fetchError } = await supabase
    .from('conversations')
    .select('id')
    .eq('guest_id', guestId)
    .eq('report_id', reportId)
    .limit(1)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  if (existing) {
    console.log('[getOrCreateConversation] Found existing conversation:', existing.id);
    return { conversationId: existing.id };
  }

  // Create new conversation
  console.log('[getOrCreateConversation] Creating new conversation with guestId:', guestId);
  const { data: newConv, error: createError } = await supabase
    .from('conversations')
    .insert({ guest_id: guestId, report_id: reportId })
    .select('id')
    .single();

  if (createError) throw new Error(createError.message);
  console.log('[getOrCreateConversation] Created new conversation:', newConv.id);
  return { conversationId: newConv.id };
};
