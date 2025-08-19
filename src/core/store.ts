import { create } from 'zustand';
import { Message } from './types';

export type ChatStatus =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'error';

interface ChatState {
  conversationId: string | null;
  status: ChatStatus;
  error: string | null;
  messages: Message[]; // Master list of all messages

  startConversation: (id: string, initialMessages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateAssistantMessage: (id: string, textDelta: string) => void;
  endStreaming: (tempId: string, finalId: string) => void;
  setStatus: (status: ChatStatus) => void;
  setError: (error: string | null) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversationId: null,
  status: 'idle',
  error: null,
  messages: [],

  startConversation: (id, initialMessages) => set({ 
    conversationId: id, 
    messages: initialMessages,
    status: 'idle', 
    error: null 
  }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),

  updateAssistantMessage: (id, textDelta) => set((state) => ({
    messages: state.messages.map(m => 
      m.id === id ? { ...m, text: m.text + textDelta } : m
    )
  })),

  endStreaming: (tempId, finalId) => set((state) => ({
    messages: state.messages.map(m => 
      m.id === tempId ? { ...m, id: finalId, status: 'complete' } : m
    ),
    status: 'idle'
  })),

  setStatus: (status) => set({ status }),
  
  setError: (error) => set({ error, status: error ? 'error' : get().status }),

  clearChat: () => set({ 
    conversationId: null, 
    messages: [], 
    status: 'idle', 
    error: null 
  }),
}));
