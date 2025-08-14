// src/services/api/conversations.ts
import { supabase } from '@/integrations/supabase/client';
import { Conversation } from '@/core/types';

export const createConversation = async (reportId?: string): Promise<Conversation> => {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ report_id: reportId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { ...data, messages: [] };
};

export const getConversation = async (id: string): Promise<Conversation> => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      messages (*)
    `)
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as Conversation;
};

export const listConversations = async (): Promise<Partial<Conversation>[]> => {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, created_at, updated_at, meta')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};
