// src/services/api/conversations.ts
import { supabase } from '@/integrations/supabase/client';
import { Conversation } from '@/core/types';
import { getGuestId } from '../auth/session';

export const createConversation = async (reportId?: string): Promise<Conversation> => {
  const guestId = getGuestId();
  const { data, error } = await supabase
    .from('conversations')
    .insert({ report_id: reportId, guest_id: guestId })
    .select()
    .single();

  if (error) throw new Error(error.message);
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
