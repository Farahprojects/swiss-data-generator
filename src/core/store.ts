import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Message } from './types';
import { Conversation } from '@/services/conversations';
import { STORAGE_KEYS } from '@/utils/storageKeys';
import { useMessageStore } from '@/stores/messageStore';
import { supabase } from '@/integrations/supabase/client';

export type ChatStatus =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'error'
  | 'loading_messages';

interface ChatState {
  // Current active chat
  chat_id: string | null;
  // Messages moved to useMessageStore - single source of truth
  status: ChatStatus;
  error: string | null;
  ttsVoice?: string;
  isLoadingMessages: boolean;
  messageLoadError: string | null;
  lastMessagesFetch: number | null;
  isAssistantTyping: boolean;
  isPaymentFlowStopIcon: boolean;

  // Thread management (single source of truth)
  threads: Conversation[];
  isLoadingThreads: boolean;
  threadsError: string | null;
  
  // Real-time sync state
  conversationChannel: any;
  isConversationSyncActive: boolean;

  // Chat actions (authenticated users only)
  startConversation: (chat_id: string) => void;
  startNewConversation: (user_id?: string) => Promise<string>;
  // Message management moved to useMessageStore - single source of truth
  setStatus: (status: ChatStatus) => void;
  setError: (error: string | null) => void;
  setTtsVoice: (v: string) => void;
  clearChat: () => void;
  clearAllData: () => void;
  setLoadingMessages: (loading: boolean) => void;
  setMessageLoadError: (error: string | null) => void;
  retryLoadMessages: () => Promise<void>;
  setAssistantTyping: (isTyping: boolean) => void;
  setPaymentFlowStopIcon: (show: boolean) => void;
  
  // Hydration and persistence
  hydrateFromStorage: (authId?: string) => string | null;
  persistActiveChat: (chat_id: string, authId?: string) => void;

  // Thread actions
  loadThreads: () => Promise<void>;
  addThread: (userId: string, title?: string) => Promise<string>;
  removeThread: (threadId: string) => Promise<void>;
  updateThreadTitle: (threadId: string, title: string) => Promise<void>;
  clearThreadsError: () => void;
  
  // Real-time sync methods
  addConversation: (conversation: Conversation) => void;
  updateConversation: (conversation: Conversation) => void;
  removeConversation: (conversationId: string) => void;
  initializeConversationSync: (userId: string) => void;
  cleanupConversationSync: () => void;
  
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
  // Current active chat
  chat_id: null,
  // Messages moved to useMessageStore - single source of truth
  status: 'idle',
  error: null,
  ttsVoice: 'Puck',
  isLoadingMessages: false,
  messageLoadError: null,
  lastMessagesFetch: null,
  isAssistantTyping: false,
  isPaymentFlowStopIcon: false,

  // Thread management (single source of truth)
  threads: [],
  isLoadingThreads: false,
  threadsError: null,
  
  // Real-time sync state
  conversationChannel: null,
  isConversationSyncActive: false,

  startConversation: (id) => {
    set({ 
      chat_id: id, 
      // messages removed - use useMessageStore instead
      status: 'idle', 
      error: null,
      messageLoadError: null,
      lastMessagesFetch: null,
      isAssistantTyping: false
    });
    
    // Persist active chat_id to sessionStorage
    get().persistActiveChat(id);
  },

  startNewConversation: async (user_id?: string) => {
    if (user_id) {
      // Auth user: create persistent conversation
      const { createConversation } = await import('@/services/conversations');
      const conversationId = await createConversation(user_id, 'New Chat');
      
      set({ 
        chat_id: conversationId,
        // messages removed - use useMessageStore instead
        status: 'idle', 
        error: null,
        messageLoadError: null,
        lastMessagesFetch: null,
        isAssistantTyping: false
      });
      
      // Persist active chat_id to sessionStorage (namespaced by user)
      get().persistActiveChat(conversationId, user_id);
      
      return conversationId;
    } else {
      throw new Error('User authentication required to create conversations.');
    }
  },

  // loadMessages removed - use useMessageStore instead

  // addMessage, updateMessage, removeMessage removed - use useMessageStore instead

  setStatus: (status) => set({ status }),
  
  setError: (error) => set({ error, status: error ? 'error' : get().status }),

  setTtsVoice: (v) => set({ ttsVoice: v }),

  setLoadingMessages: (loading) => set({ isLoadingMessages: loading }),

  setMessageLoadError: (error) => set({ messageLoadError: error, isLoadingMessages: false }),

  retryLoadMessages: async () => {
    const state = get();
    if (!state.chat_id) return;
    
    try {
      set({ isLoadingMessages: true, messageLoadError: null });
      // Message loading moved to useMessageStore
      // Just trigger a refetch by setting chat_id
      const { setChatId } = useMessageStore.getState();
      if (state.chat_id) {
        setChatId(state.chat_id);
      }
    } catch (error) {
      console.error('[Store] Retry load messages failed:', error);
      set({ 
        messageLoadError: error instanceof Error ? error.message : 'Failed to load messages',
        isLoadingMessages: false
      });
    }
  },

  clearChat: () => {
    const state = get();
    
    // Clear message store when clearing chat
    import('@/stores/messageStore').then(({ useMessageStore }) => {
      useMessageStore.getState().clearMessages();
    });
    
    set({ 
      chat_id: null, 
      // messages removed - use useMessageStore instead
      status: 'idle', 
      error: null,
      isLoadingMessages: false,
      messageLoadError: null,
      lastMessagesFetch: null,
      isAssistantTyping: false,
      isPaymentFlowStopIcon: false
    });
    
    // Clear namespaced chat_id storage keys
    if (typeof window !== 'undefined') {
      try {
        // Clear shared cache
        sessionStorage.removeItem(STORAGE_KEYS.CHAT.SHARED.UUID);
        
        // Clear any auth keys (in case of mixed state)
        const authKeys = Object.keys(sessionStorage).filter(key => 
          key.startsWith('therai_active_chat_auth_')
        );
        authKeys.forEach(key => {
          sessionStorage.removeItem(key);
        });
        
        
        // Extra safety: Clear any remaining chat-related keys
        const chatKeys = Object.keys(sessionStorage).filter(key => 
          key.includes('chat_id') || key.includes('therai_chat')
        );
        chatKeys.forEach(key => {
          sessionStorage.removeItem(key);
        });
      } catch (error) {
        console.error('[Store] Error clearing namespaced chat_id keys:', error);
      }
    }
  },

  clearAllData: () => {
    // Clean up real-time sync
    get().cleanupConversationSync();
    
    // Clear all chat data
    get().clearChat();
    
    // Clear threads
    set({ 
      threads: [], 
      isLoadingThreads: false, 
      threadsError: null 
    });
  },

  setAssistantTyping: (isTyping) => set({ isAssistantTyping: isTyping }),

  setPaymentFlowStopIcon: (show) => set({ isPaymentFlowStopIcon: show }),

  // Thread actions
  loadThreads: async () => {
    set({ isLoadingThreads: true, threadsError: null });
    try {
      const { listConversations } = await import('@/services/conversations');
      const conversations = await listConversations();
      
      // Sort by updated_at desc for proper ordering
      const sortedConversations = conversations.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      
      
      set({ threads: sortedConversations, isLoadingThreads: false });
      
      // Initialize real-time sync after initial load
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        get().initializeConversationSync(user.id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load threads';
      set({ threadsError: errorMessage, isLoadingThreads: false });
    }
  },

  addThread: async (userId: string, title?: string) => {
    set({ isLoadingThreads: true, threadsError: null });
    try {
      const { createConversation } = await import('@/services/conversations');
      const conversationId = await createConversation(userId, title);
      
      // Add new thread to local state immediately for instant UI feedback
      const newThread = {
        id: conversationId,
        user_id: userId,
        title: title || 'New Chat',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        meta: null
      };
      
      set(state => ({
        threads: [newThread, ...state.threads], // Add to beginning of list
        isLoadingThreads: false
      }));
      
      return conversationId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create thread';
      set({ threadsError: errorMessage, isLoadingThreads: false });
      throw error;
    }
  },

  removeThread: async (threadId: string) => {
    set({ isLoadingThreads: true, threadsError: null });
    try {
      const { deleteConversation } = await import('@/services/conversations');
      await deleteConversation(threadId);
      
      // Update local state immediately for instant UI feedback
      set(state => ({
        threads: state.threads.filter(thread => thread.id !== threadId),
        isLoadingThreads: false
      }));
      
      // If this was the current chat, clear the session
      if (get().chat_id === threadId) {
        get().clearChat();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete thread';
      set({ threadsError: errorMessage, isLoadingThreads: false });
      throw error;
    }
  },

  updateThreadTitle: async (threadId: string, title: string) => {
    set({ isLoadingThreads: true, threadsError: null });
    try {
      const { updateConversationTitle } = await import('@/services/conversations');
      await updateConversationTitle(threadId, title);
      // Update local state
      set(state => ({
        threads: state.threads.map(thread => 
          thread.id === threadId ? { ...thread, title, updated_at: new Date().toISOString() } : thread
        ),
        isLoadingThreads: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update thread title';
      set({ threadsError: errorMessage, isLoadingThreads: false });
      throw error;
    }
  },

  clearThreadsError: () => set({ threadsError: null }),

  // Real-time sync methods
  addConversation: (conversation: Conversation) => {
    set(state => {
      // Check if conversation already exists to avoid duplicates
      const exists = state.threads.some(thread => thread.id === conversation.id);
      if (exists) {
        return state;
      }
      
      // Add new conversation and sort by updated_at desc
      const updatedThreads = [conversation, ...state.threads].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      
      return { threads: updatedThreads };
    });
  },

  updateConversation: (conversation: Conversation) => {
    set(state => ({
      threads: state.threads.map(thread => 
        thread.id === conversation.id ? conversation : thread
      ).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
    }));
  },

  removeConversation: (conversationId: string) => {
    set(state => ({
      threads: state.threads.filter(thread => thread.id !== conversationId)
    }));
  },

  initializeConversationSync: (userId: string) => {
    const state = get();
    
    // Don't initialize if already active
    if (state.isConversationSyncActive) {
      return;
    }

    const channel = supabase
      .channel(`conversations:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT':
              get().addConversation(payload.new as Conversation);
              break;
            case 'UPDATE':
              get().updateConversation(payload.new as Conversation);
              break;
            case 'DELETE':
              get().removeConversation(payload.old.id);
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          set({ isConversationSyncActive: true });
        }
      });

    set({ conversationChannel: channel });
  },

  cleanupConversationSync: () => {
    const state = get();
    
    if (state.conversationChannel) {
      supabase.removeChannel(state.conversationChannel);
      set({ 
        conversationChannel: null, 
        isConversationSyncActive: false 
      });
    }
  },


  // Hydration and persistence methods
  hydrateFromStorage: (authId?: string) => {
    if (typeof window === 'undefined') return null;
    
    try {
      // Try shared cache first
      const cachedChatId = sessionStorage.getItem(STORAGE_KEYS.CHAT.SHARED.UUID);
      if (cachedChatId) {
        console.log('[Store] Hydrated from shared cache:', cachedChatId);
        return cachedChatId;
      }
      
      console.log('[Store] No cached chat_id found');
      return null;
    } catch (error) {
      console.error('[Store] Error hydrating from storage:', error);
      return null;
    }
  },

  persistActiveChat: (chat_id: string, authId?: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      // Always write to sessionStorage as cache
      sessionStorage.setItem(STORAGE_KEYS.CHAT.SHARED.UUID, chat_id);
      
      // Also write to namespaced keys if available (for user-specific caching)
      if (authId) {
        const authKey = STORAGE_KEYS.CHAT.ACTIVE.AUTH(authId);
        sessionStorage.setItem(authKey, chat_id);
      }
    } catch (error) {
      console.error('[Store] Error persisting chat_id to storage:', error);
    }
  },
}),
    {
      name: 'therai-chat-store',
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
        },
      },
      // Only persist essential state, not real-time sync data or functions
      partialize: (state: ChatState) => ({
        chat_id: state.chat_id,
        status: state.status,
        error: state.error,
        ttsVoice: state.ttsVoice,
        isAssistantTyping: state.isAssistantTyping,
        isPaymentFlowStopIcon: state.isPaymentFlowStopIcon,
        threads: state.threads,
        isLoadingMessages: state.isLoadingMessages,
        messageLoadError: state.messageLoadError,
        lastMessagesFetch: state.lastMessagesFetch,
        isLoadingThreads: state.isLoadingThreads,
        threadsError: state.threadsError,
        // Exclude conversationChannel and isConversationSyncActive from persistence
        // as they contain circular references and should be re-initialized
      } as Partial<ChatState>),
    }
  )
);
