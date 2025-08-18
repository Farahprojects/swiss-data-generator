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
  status: ChatStatus;
  error: string | null;
  ttsProvider?: 'google' | 'openai';
  ttsVoice?: string;
  
  // Lightweight view flags only - no message content stored
  messageIds: string[];
  lastMessageId: string | null;

  startConversation: (id: string) => void;
  setMessageIds: (ids: string[]) => void;
  addMessageId: (id: string) => void;
  setLastMessageId: (id: string | null) => void;
  setStatus: (status: ChatStatus) => void;
  setError: (error: string | null) => void;
  setTtsProvider: (p: 'google' | 'openai') => void;
  setTtsVoice: (v: string) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversationId: null,
  messageIds: [],
  lastMessageId: null,
  status: 'idle',
  error: null,
  ttsProvider: 'google',
  ttsVoice: 'en-US-Studio-O',

  startConversation: (id) => set({ 
    conversationId: id, 
    messageIds: [], 
    lastMessageId: null,
    status: 'idle', 
    error: null 
  }),

  setMessageIds: (ids) => set({ messageIds: ids }),

  addMessageId: (id) => set((state) => ({ 
    messageIds: [...state.messageIds, id],
    lastMessageId: id
  })),

  setLastMessageId: (id) => set({ lastMessageId: id }),

  setStatus: (status) => set({ status }),
  
  setError: (error) => set({ error, status: error ? 'error' : get().status }),

  setTtsProvider: (p) => set({ ttsProvider: p }),
  setTtsVoice: (v) => set({ ttsVoice: v }),

  clearChat: () => set({ 
    conversationId: null, 
    messageIds: [], 
    lastMessageId: null,
    status: 'idle', 
    error: null 
  }),
}));
