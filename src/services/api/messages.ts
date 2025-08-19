// src/services/api/messages.ts
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/core/types';

export const appendMessage = async (message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> => {
  const { conversationId, ...rest } = message;
  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: conversationId, // Use chat_id column in database
      ...rest
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  // Map back to client interface
  return {
    ...data,
    conversationId: data.chat_id
  } as Message;
};

export const updateMessage = async (id: string, updates: Partial<Message>): Promise<Message> => {
  const { data, error } = await supabase
    .from('messages')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Message;
};

export const getMessagesForConversation = async (chat_id: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chat_id)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  
  // Filter out context injection messages from UI display
  return (data || [])
    .filter(msg => !msg.context_injected)
    .map(msg => ({
      id: msg.id,
      conversationId: msg.chat_id, // Map to client interface for compatibility
      role: msg.role,
      text: msg.text,
      audioUrl: msg.audio_url,
      timings: msg.timings,
      createdAt: msg.created_at,
      meta: msg.meta
    }));
};
