// src/services/api/messages.ts
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/core/types';

export const appendMessage = async (message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: message.chat_id,
      role: message.role,
      text: message.text,
      audio_url: message.audioUrl,
      timings: message.timings,
      meta: message.meta,
      client_msg_id: message.client_msg_id,
      status: message.status
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  // Map back to client interface
  return {
    id: data.id,
    chat_id: data.chat_id,
    role: data.role,
    text: data.text,
    audioUrl: data.audio_url,
    timings: data.timings,
    createdAt: data.created_at,
    meta: data.meta,
    client_msg_id: data.client_msg_id,
    status: data.status
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
      chat_id: msg.chat_id,
      role: msg.role,
      text: msg.text,
      audioUrl: msg.audio_url,
      timings: msg.timings,
      createdAt: msg.created_at,
      meta: msg.meta,
      client_msg_id: msg.client_msg_id,
      status: msg.status
    }));
};
