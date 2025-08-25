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

  startConversation: (id: string) => void;
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

  startConversation: (id) => set({ 
    chat_id: id, 
    messages: [], 
    status: 'idle', 
    error: null,
    messageLoadError: null,
    lastMessagesFetch: null
  }),

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
    // Prevent duplicate messages
    if (state.messages.find(m => m.id === message.id)) {
      return state;
    }
    return { messages: [...state.messages, message] };
  }),

  updateMessage: (id, updates) => {
    set((state) => {
      const newMessages = state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      );
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
    lastMessagesFetch: null
  }),
}));
