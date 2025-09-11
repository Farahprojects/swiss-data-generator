import { create } from 'zustand';
import { Message } from './types';
import { Conversation } from '@/services/conversations';
import { STORAGE_KEYS } from '@/utils/storageKeys';

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
  guest_id: string | null;
  messages: Message[];
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

  // Chat actions (unified for both auth and guest)
  startConversation: (chat_id: string, guest_id?: string) => void;
  startNewConversation: (user_id?: string) => Promise<string>;
  loadMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  setStatus: (status: ChatStatus) => void;
  setError: (error: string | null) => void;
  setTtsVoice: (v: string) => void;
  clearChat: () => void;
  setLoadingMessages: (loading: boolean) => void;
  setMessageLoadError: (error: string | null) => void;
  retryLoadMessages: () => Promise<void>;
  setAssistantTyping: (isTyping: boolean) => void;
  setPaymentFlowStopIcon: (show: boolean) => void;
  
  // Hydration and persistence
  hydrateFromStorage: (authId?: string, guestId?: string) => string | null;
  persistActiveChat: (chat_id: string, authId?: string, guestId?: string) => void;

  // Thread actions
  loadThreads: () => Promise<void>;
  addThread: (userId: string, title?: string) => Promise<string>;
  removeThread: (threadId: string) => Promise<void>;
  updateThreadTitle: (threadId: string, title: string) => Promise<void>;
  clearThreadsError: () => void;
  
  // Guest management helpers
  getGuestId: () => string | null;
  setGuestId: (guestId: string) => void;
  clearGuestData: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Current active chat
  chat_id: null,
  guest_id: null,
  messages: [],
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

  startConversation: (id, guest_id) => {
    set({ 
      chat_id: id, 
      guest_id: guest_id,
      messages: [], 
      status: 'idle', 
      error: null,
      messageLoadError: null,
      lastMessagesFetch: null,
      isAssistantTyping: false
    });
    
    // Persist active chat_id to sessionStorage (always writes to cache)
    get().persistActiveChat(id, undefined, guest_id);
  },

  startNewConversation: async (user_id?: string) => {
    if (user_id) {
      // Auth user: create persistent conversation
      const { createConversation } = await import('@/services/conversations');
      const conversationId = await createConversation(user_id, 'New Chat');
      
      set({ 
        chat_id: conversationId,
        guest_id: null,
        messages: [], 
        status: 'idle', 
        error: null,
        messageLoadError: null,
        lastMessagesFetch: null,
        isAssistantTyping: false
      });
      
      // Persist active chat_id to sessionStorage (namespaced by user)
      get().persistActiveChat(conversationId, user_id, undefined);
      
      return conversationId;
    } else {
      // Guest user: No longer create chat IDs on frontend
      // All guest chat IDs must come from backend (threads-manager edge function)
      throw new Error('Guest users cannot create chat IDs on frontend. Use threads-manager edge function.');
    }
  },

  loadMessages: (messages) => {
    const uniqueMessages = messages.filter((msg, index, arr) => 
      arr.findIndex(m => m.id === msg.id) === index
    );
    set({ 
      messages: uniqueMessages, 
      isLoadingMessages: false, 
      messageLoadError: null,
      lastMessagesFetch: Date.now()
    });
  },

  addMessage: (message) => set((state) => {
    // Enhanced deduplication: check both id and client_msg_id
    const existingById = state.messages.find(m => m.id === message.id);
    const existingByClientId = message.client_msg_id ? 
      state.messages.find(m => m.client_msg_id === message.client_msg_id) : null;
    
    // If message already exists by id, skip
    if (existingById) {
      return state;
    }
    
    // If there's an optimistic message with same client_msg_id, replace it
    if (existingByClientId) {
      const newMessages = state.messages.map(m => 
        m.client_msg_id === message.client_msg_id ? { ...message } : m
      );
      return { messages: newMessages };
    }
    
    const result = { messages: [...state.messages, message] };
    return result;
  }),

  updateMessage: (id, updates) => {
    set((state) => {
      const newMessages = state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      );
      
      // If the update includes a new id, remove any duplicate with that id
      if (updates.id && updates.id !== id) {
        const filteredMessages = newMessages.filter((msg, index, arr) => 
          !(msg.id === updates.id && arr.findIndex(m => m.id === updates.id) !== index)
        );
        return { messages: filteredMessages };
      }
      
      return { messages: newMessages };
    });
  },

  removeMessage: (id) => {
    set((state) => ({
      messages: state.messages.filter(msg => msg.id !== id)
    }));
  },

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
      const { getMessagesForConversation } = await import('@/services/api/messages');
      const messages = await getMessagesForConversation(state.chat_id);
      get().loadMessages(messages);
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
    
    set({ 
      chat_id: null, 
      guest_id: null,
      messages: [], 
      status: 'idle', 
      error: null,
      isLoadingMessages: false,
      messageLoadError: null,
      lastMessagesFetch: null,
      isAssistantTyping: false,
      isPaymentFlowStopIcon: false
    });
    
    // Clear guest data from storage as well
    get().clearGuestData();
    
    // Clear namespaced chat_id storage keys
    if (typeof window !== 'undefined') {
      try {
        // Clear shared cache
        sessionStorage.removeItem(STORAGE_KEYS.CHAT.SHARED.UUID);
        
        // Clear auth namespaced key if we have auth user
        if (state.guest_id) {
          const guestKey = STORAGE_KEYS.CHAT.ACTIVE.GUEST(state.guest_id);
          sessionStorage.removeItem(guestKey);
        }
        
        // Clear any auth keys (in case of mixed state)
        const authKeys = Object.keys(sessionStorage).filter(key => 
          key.startsWith('therai_active_chat_auth_')
        );
        authKeys.forEach(key => {
          sessionStorage.removeItem(key);
        });
        
        // Clear any guest keys (in case of mixed state)
        const guestKeys = Object.keys(sessionStorage).filter(key => 
          key.startsWith('therai_active_chat_guest_')
        );
        guestKeys.forEach(key => {
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

  setAssistantTyping: (isTyping) => set({ isAssistantTyping: isTyping }),

  setPaymentFlowStopIcon: (show) => set({ isPaymentFlowStopIcon: show }),

  // Thread actions
  loadThreads: async () => {
    set({ isLoadingThreads: true, threadsError: null });
    try {
      const { listConversations } = await import('@/services/conversations');
      const conversations = await listConversations();
      set({ threads: conversations, isLoadingThreads: false });
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
      // Reload threads to get the new one with proper timestamps
      await get().loadThreads();
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
      // Remove from local state
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

  // Guest management helpers
  getGuestId: () => {
    const state = get();
    return state.guest_id;
  },
  
  setGuestId: (guestId: string) => {
    set({ guest_id: guestId });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEYS.CHAT.GUEST.CHAT_ID, guestId);
    }
  },
  
  clearGuestData: () => {
    set({ guest_id: null });
    if (typeof window !== 'undefined') {
      // Clear guest-related keys (excluding deprecated ones)
      sessionStorage.removeItem(STORAGE_KEYS.CHAT.GUEST.CHAT_ID);
      sessionStorage.removeItem(STORAGE_KEYS.CHAT.GUEST.SESSION_TOKEN);
      // Clear shared cache as well
      sessionStorage.removeItem(STORAGE_KEYS.CHAT.SHARED.UUID);
    }
  },

  // Hydration and persistence methods
  hydrateFromStorage: (authId?: string, guestId?: string) => {
    if (typeof window === 'undefined') return null;
    
    try {
      // Try shared cache first (guest/auth agnostic)
      const cachedChatId = sessionStorage.getItem(STORAGE_KEYS.CHAT.SHARED.UUID);
      if (cachedChatId) {
        return cachedChatId;
      }
      
      // Fallback to namespaced keys if available
      if (authId) {
        const authKey = STORAGE_KEYS.CHAT.ACTIVE.AUTH(authId);
        const storedChatId = sessionStorage.getItem(authKey);
        if (storedChatId) {
          return storedChatId;
        }
      }
      
      if (guestId) {
        const guestKey = STORAGE_KEYS.CHAT.ACTIVE.GUEST(guestId);
        const storedChatId = sessionStorage.getItem(guestKey);
        if (storedChatId) {
          return storedChatId;
        }
      }
      
      return null;
    } catch (error) {
      console.error('[Store] Error hydrating from storage:', error);
      return null;
    }
  },

  persistActiveChat: (chat_id: string, authId?: string, guestId?: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      // Always write to sessionStorage as cache (guest/auth agnostic)
      sessionStorage.setItem(STORAGE_KEYS.CHAT.SHARED.UUID, chat_id);
      
      // Also write to namespaced keys if available (for user-specific caching)
      if (authId) {
        const authKey = STORAGE_KEYS.CHAT.ACTIVE.AUTH(authId);
        sessionStorage.setItem(authKey, chat_id);
      }
      
      if (guestId) {
        const guestKey = STORAGE_KEYS.CHAT.ACTIVE.GUEST(guestId);
        sessionStorage.setItem(guestKey, chat_id);
      }
    } catch (error) {
      console.error('[Store] Error persisting chat_id to storage:', error);
    }
  },
}));
