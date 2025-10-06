import { supabase } from '@/integrations/supabase/client';

export interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
  meta?: Record<string, any> | null;
  is_public?: boolean;
  share_token?: string;
  share_mode?: 'view_only' | 'join_conversation';
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'owner' | 'participant' | 'observer';
  joined_at: string;
  last_seen_at: string;
  notes?: Record<string, any>;
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
 * Share a conversation publicly using edge function
 */
export const shareConversation = async (conversationId: string, mode: 'view_only' | 'join_conversation' = 'view_only'): Promise<string> => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase.functions.invoke('conversation-manager?action=share_conversation', {
    body: {
      user_id: user.id,
      conversation_id: conversationId,
      share_mode: mode
    }
  });

  if (error) {
    console.error('[Conversations] Error sharing conversation:', error);
    throw new Error('Failed to share conversation');
  }

  return data.share_token;
};

/**
 * Stop sharing a conversation using edge function
 */
export const unshareConversation = async (conversationId: string): Promise<void> => {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase.functions.invoke('conversation-manager?action=unshare_conversation', {
    body: {
      user_id: user.id,
      conversation_id: conversationId
    }
  });

  if (error) {
    console.error('[Conversations] Error unsharing conversation:', error);
    throw new Error('Failed to unshare conversation');
  }
};

/**
 * Get a shared conversation by share token (public access)
 */
export const getSharedConversation = async (shareToken: string): Promise<Conversation> => {
  const { data, error } = await supabase.functions.invoke('conversation-manager?action=get_shared_conversation', {
    body: {
      share_token: shareToken
    }
  });

  if (error) {
    console.error('[Conversations] Error getting shared conversation:', error);
    throw new Error('Failed to get shared conversation');
  }

  return data;
};

// Collaborative actions
export const joinConversationByToken = async (shareToken: string): Promise<{ conversation_id: string }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase.functions.invoke('conversation-manager?action=join_conversation', {
    body: { user_id: user.id, share_token: shareToken }
  });
  if (error) {
    console.error('[Conversations] Error joining conversation:', error);
    throw new Error('Failed to join conversation');
  }
  return data;
};

export const leaveConversation = async (conversationId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase.functions.invoke('conversation-manager?action=leave_conversation', {
    body: { user_id: user.id, conversation_id: conversationId }
  });
  if (error) {
    console.error('[Conversations] Error leaving conversation:', error);
    throw new Error('Failed to leave conversation');
  }
};

export const listParticipants = async (conversationId: string): Promise<ConversationParticipant[]> => {
  const { data, error } = await supabase.functions.invoke('conversation-manager?action=get_conversation_participants', {
    body: { conversation_id: conversationId }
  });
  if (error) {
    console.error('[Conversations] Error listing participants:', error);
    throw new Error('Failed to list participants');
  }
  return data || [];
};

export const updateMyParticipantNotes = async (conversationId: string, notes: Record<string, any>): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase.functions.invoke('conversation-manager?action=update_participant_notes', {
    body: { user_id: user.id, conversation_id: conversationId, notes }
  });
  if (error) {
    console.error('[Conversations] Error updating notes:', error);
    throw new Error('Failed to update notes');
  }
};
