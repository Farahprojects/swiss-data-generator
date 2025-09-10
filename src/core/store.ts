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
  setStatus: (status: ChatStatus) => void;
  setError: (error: string | null) => void;
  setTtsVoice: (v: string) => void;
  clearChat: () => void;
  setLoadingMessages: (loading: boolean) => void;
  setMessageLoadError: (error: string | null) => void;
  retryLoadMessages: () => Promise<void>;
  setAssistantTyping: (isTyping: boolean) => void;

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

  // Thread management (single source of truth)
  threads: [],
  isLoadingThreads: false,
  threadsError: null,

  startConversation: (id, guest_id) => {
    // If guest_id not provided, try to get from sessionStorage using centralized key
    const finalGuestId = guest_id || (typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEYS.CHAT.GUEST.REPORT_ID) : null);
    
    set({ 
      chat_id: id, 
      guest_id: finalGuestId,
      messages: [], 
      status: 'idle', 
      error: null,
      messageLoadError: null,
      lastMessagesFetch: null,
      isAssistantTyping: false
    });
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
    set({ 
      chat_id: null, 
      guest_id: null,
      messages: [], 
      status: 'idle', 
      error: null,
      isLoadingMessages: false,
      messageLoadError: null,
      lastMessagesFetch: null,
      isAssistantTyping: false
    });
    
    // Clear guest data from storage as well
    get().clearGuestData();
  },

  setAssistantTyping: (isTyping) => set({ isAssistantTyping: isTyping }),

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
    return state.guest_id || (typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEYS.CHAT.GUEST.REPORT_ID) : null);
  },
  
  setGuestId: (guestId: string) => {
    set({ guest_id: guestId });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEYS.CHAT.GUEST.REPORT_ID, guestId);
    }
  },
  
  clearGuestData: () => {
    set({ guest_id: null });
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEYS.CHAT.GUEST.REPORT_ID);
      // Clear other guest-related keys
      Object.values(STORAGE_KEYS.CHAT.GUEST).forEach(key => {
        sessionStorage.removeItem(key);
      });
    }
  },
}));
