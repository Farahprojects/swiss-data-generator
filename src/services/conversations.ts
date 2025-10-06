import { supabase } from '@/integrations/supabase/client';

export interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
  meta?: Record<string, any> | null;
  shared_from_user_id?: string;
  is_shared_copy?: boolean;
}

export interface ConversationInvitee {
  email: string;
  user_id: string;
  joined_at: string;
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
export const listConversations = async (limit?: number, offset?: number): Promise<Conversation[]> => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.functions.invoke('conversation-manager?action=list_conversations', {
    body: {
      user_id: user.id,
      limit: limit || 50, // Default to 50 conversations
      offset: offset || 0
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

/**
 * Invite a user to a conversation by email
 */
export const inviteUserToConversation = async (conversationId: string, email: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.functions.invoke('conversation-manager?action=invite_user_to_conversation', {
    body: {
      user_id: user.id,
      conversation_id: conversationId,
      invitee_email: email
    }
  });

  if (error) {
    console.error('[Conversations] Error inviting user:', error);
    throw new Error(error.message || 'Failed to invite user');
  }

  return data;
};

/**
 * Remove shared access to a conversation (removes all invitees)
 */
export const unshareConversation = async (conversationId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.functions.invoke('conversation-manager?action=unshare_conversation', {
    body: {
      user_id: user.id,
      conversation_id: conversationId
    }
  });

  if (error) {
    console.error('[Conversations] Error unsharing conversation:', error);
    throw new Error(error.message || 'Failed to unshare conversation');
  }

  return data;
};

/**
 * Remove a specific user from a shared conversation
 */
export const removeUserFromConversation = async (conversationId: string, email: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.functions.invoke('conversation-manager?action=remove_user_from_conversation', {
    body: {
      user_id: user.id,
      conversation_id: conversationId,
      invitee_email: email
    }
  });

  if (error) {
    console.error('[Conversations] Error removing user:', error);
    throw new Error(error.message || 'Failed to remove user');
  }

  return data;
};

/**
 * Get list of users who have been invited to a conversation
 */
export const getConversationInvitees = async (conversationId: string): Promise<ConversationInvitee[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get all shared copies of this conversation (invitees)
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      user_id,
      created_at,
      profiles:user_id (
        email
      )
    `)
    .eq('id', conversationId)
    .eq('shared_from_user_id', user.id)
    .eq('is_shared_copy', true);

  if (error) {
    console.error('[Conversations] Error getting invitees:', error);
    throw new Error('Failed to get conversation invitees');
  }

  return (data || []).map(invitee => ({
    user_id: invitee.user_id,
    email: invitee.profiles?.email || '',
    joined_at: invitee.created_at
  }));
};

