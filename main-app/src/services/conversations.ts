import { supabase } from '@/integrations/supabase/client';

export interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new conversation for an authenticated user using edge function
 */
export const createConversation = async (userId: string, title?: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('conversation-manager?action=create_conversation', {
    body: {
      user_id: userId,
      title: title || 'New Chat'
    }
  });

  if (error) {
    console.error('[Conversations] Error creating conversation:', error);
    throw new Error('Failed to create conversation');
  }

  return data.id;
};

/**
 * List all conversations for an authenticated user using edge function
 */
export const listConversations = async (): Promise<Conversation[]> => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.functions.invoke('conversation-manager?action=list_conversations', {
    body: {
      user_id: user.id
    }
  });

  if (error) {
    console.error('[Conversations] Error listing conversations:', error);
    throw new Error('Failed to load conversations');
  }

  return data || [];
};

/**
 * Delete a conversation and all its messages using edge function
 */
export const deleteConversation = async (conversationId: string): Promise<void> => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase.functions.invoke('conversation-manager?action=delete_conversation', {
    body: {
      user_id: user.id,
      conversation_id: conversationId
    }
  });

  if (error) {
    console.error('[Conversations] Error deleting conversation:', error);
    throw new Error('Failed to delete conversation');
  }
};

/**
 * Update conversation title using edge function
 */
export const updateConversationTitle = async (conversationId: string, title: string): Promise<void> => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase.functions.invoke('conversation-manager?action=update_conversation_title', {
    body: {
      user_id: user.id,
      conversation_id: conversationId,
      title
    }
  });

  if (error) {
    console.error('[Conversations] Error updating conversation title:', error);
    throw new Error('Failed to update conversation title');
  }
};
