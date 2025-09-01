import { create } from 'zustand';
import { Conversation, Message } from './types';

export type ChatStatus =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'error'
  | 'loading_messages';

interface ChatState {
  chat_id: string | null;
  messages: Message[];
  status: ChatStatus;
  error: string | null;
  ttsVoice?: string;
  isLoadingMessages: boolean;
  messageLoadError: string | null;
  lastMessagesFetch: number | null;
  isAssistantTyping: boolean;

  startConversation: (id: string) => void;
  startNewGuestConversation: () => void;
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
}

export const useChatStore = create<ChatState>((set, get) => ({
  chat_id: null,
  messages: [],
  status: 'idle',
  error: null,
  ttsVoice: 'Puck',
  isLoadingMessages: false,
  messageLoadError: null,
  lastMessagesFetch: null,
  isAssistantTyping: false,

  startConversation: (id) => set({ 
    chat_id: id, 
    messages: [], 
    status: 'idle', 
    error: null,
    messageLoadError: null,
    lastMessagesFetch: null,
    isAssistantTyping: false
  }),

  startNewGuestConversation: () => {
    const newChatId = crypto.randomUUID();
    set({ 
      chat_id: newChatId, 
      messages: [], 
      status: 'idle', 
      error: null,
      messageLoadError: null,
      lastMessagesFetch: null,
      isAssistantTyping: false
    });
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

  clearChat: () => set({ 
    chat_id: null, 
    messages: [], 
    status: 'idle', 
    error: null,
    isLoadingMessages: false,
    messageLoadError: null,
    lastMessagesFetch: null,
    isAssistantTyping: false
  }),

  setAssistantTyping: (isTyping) => set({ isAssistantTyping: isTyping }),
}));
