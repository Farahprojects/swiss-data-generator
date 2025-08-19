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
  chat_id: string | null;
  messages: Message[];
  status: ChatStatus;
  error: string | null;
  ttsProvider?: 'google' | 'openai';
  ttsVoice?: string;

  startConversation: (id: string) => void;
  loadMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setStatus: (status: ChatStatus) => void;
  setError: (error: string | null) => void;
  setTtsProvider: (p: 'google' | 'openai') => void;
  setTtsVoice: (v: string) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chat_id: null,
  messages: [],
  status: 'idle',
  error: null,
  ttsProvider: 'google',
  ttsVoice: 'en-US-Studio-O',

  startConversation: (id) => set({ chat_id: id, messages: [], status: 'idle', error: null }),

  loadMessages: (messages) => set({ messages }),

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    })),

  setStatus: (status) => set({ status }),
  
  setError: (error) => set({ error, status: error ? 'error' : get().status }),

  setTtsProvider: (p) => set({ ttsProvider: p }),
  setTtsVoice: (v) => set({ ttsVoice: v }),

  clearChat: () => set({ chat_id: null, guest_id: null, messages: [], status: 'idle', error: null }),
}));
