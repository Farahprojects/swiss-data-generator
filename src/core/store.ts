import { create } from 'zustand';
import { Conversation, Message } from './types';

export type ChatStatus =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'error';

interface ChatState {
  conversationId: string | null;
  messages: Message[];
  status: ChatStatus;
  error: string | null;

  startConversation: (id: string) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setStatus: (status: ChatStatus) => void;
  setError: (error: string | null) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversationId: null,
  messages: [],
  status: 'idle',
  error: null,

  startConversation: (id) => set({ conversationId: id, messages: [], status: 'idle', error: null }),

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    })),

  setStatus: (status) => set({ status }),
  
  setError: (error) => set({ error, status: error ? 'error' : get().status }),

  clearChat: () => set({ conversationId: null, messages: [], status: 'idle', error: null }),
}));
