import { supabase } from '@/integrations/supabase/client';

export interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new conversation for an authenticated user
 */
export const createConversation = async (userId: string, title?: string): Promise<string> => {
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      title: title || 'New Chat'
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Conversations] Error creating conversation:', error);
    throw new Error('Failed to create conversation');
  }

  return data.id;
};

/**
 * List all conversations for an authenticated user
 */
export const listConversations = async (): Promise<Conversation[]> => {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, user_id, title, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[Conversations] Error listing conversations:', error);
    throw new Error('Failed to load conversations');
  }

  return data || [];
};

/**
 * Delete a conversation and all its messages
 */
export const deleteConversation = async (conversationId: string): Promise<void> => {
  // First delete all messages in this conversation
  const { error: messagesError } = await supabase
    .from('messages')
    .delete()
    .eq('chat_id', conversationId);

  if (messagesError) {
    console.error('[Conversations] Error deleting messages:', messagesError);
    throw new Error('Failed to delete conversation messages');
  }

  // Then delete the conversation itself
  const { error: conversationError } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);

  if (conversationError) {
    console.error('[Conversations] Error deleting conversation:', conversationError);
    throw new Error('Failed to delete conversation');
  }
};

/**
 * Update conversation title
 */
export const updateConversationTitle = async (conversationId: string, title: string): Promise<void> => {
  const { error } = await supabase
    .from('conversations')
    .update({ 
      title,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId);

  if (error) {
    console.error('[Conversations] Error updating conversation title:', error);
    throw new Error('Failed to update conversation title');
  }
};
