import { create } from 'zustand';
import { Conversation, createConversation, listConversations, deleteConversation, updateConversationTitle } from '@/services/conversations';

interface UserConversationsState {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadConversations: () => Promise<void>;
  addConversation: (userId: string, title?: string) => Promise<string>;
  removeConversation: (conversationId: string) => Promise<void>;
  updateTitle: (conversationId: string, title: string) => Promise<void>;
  clearError: () => void;
}

export const useUserConversationsStore = create<UserConversationsState>((set, get) => ({
  conversations: [],
  isLoading: false,
  error: null,

  loadConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const conversations = await listConversations();
      set({ conversations, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load conversations';
      set({ error: errorMessage, isLoading: false });
    }
  },

  addConversation: async (userId: string, title?: string) => {
    set({ isLoading: true, error: null });
    try {
      const conversationId = await createConversation(userId, title);
      // Reload conversations to get the new one with proper timestamps
      await get().loadConversations();
      return conversationId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create conversation';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  removeConversation: async (conversationId: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteConversation(conversationId);
      // Remove from local state
      set(state => ({
        conversations: state.conversations.filter(conv => conv.id !== conversationId),
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete conversation';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  updateTitle: async (conversationId: string, title: string) => {
    set({ isLoading: true, error: null });
    try {
      await updateConversationTitle(conversationId, title);
      // Update local state
      set(state => ({
        conversations: state.conversations.map(conv => 
          conv.id === conversationId ? { ...conv, title, updated_at: new Date().toISOString() } : conv
        ),
        isLoading: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update conversation title';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null })
}));
