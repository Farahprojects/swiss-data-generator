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
  
  // Streaming state
  isStreaming: boolean;
  streamingText: string;
  
  // Lightweight view flags only - no message content stored
  messageIds: string[];
  lastMessageId: string | null;

  startConversation: (id: string) => void;
  setMessageIds: (ids: string[]) => void;
  addMessageId: (id: string) => void;
  setLastMessageId: (id: string | null) => void;
  setStatus: (status: ChatStatus) => void;
  setError: (error: string | null) => void;
  
  // Streaming actions
  startStreaming: () => void;
  appendStreamingText: (text: string) => void;
  endStreaming: () => void;
  
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversationId: null,
  messageIds: [],
  lastMessageId: null,
  status: 'idle',
  error: null,
  isStreaming: false,
  streamingText: '',

  startConversation: (id) => set({ 
    conversationId: id, 
    messageIds: [], 
    lastMessageId: null,
    status: 'idle', 
    error: null,
    isStreaming: false,
    streamingText: ''
  }),

  setMessageIds: (ids) => set({ messageIds: ids }),

  addMessageId: (id) => set((state) => ({ 
    messageIds: [...state.messageIds, id],
    lastMessageId: id
  })),

  setLastMessageId: (id) => set({ lastMessageId: id }),

  setStatus: (status) => set({ status }),
  
  setError: (error) => set({ error, status: error ? 'error' : get().status }),

  startStreaming: () => set({ 
    isStreaming: true, 
    streamingText: '',
    status: 'thinking'
  }),

  appendStreamingText: (text) => set((state) => ({
    streamingText: state.streamingText + text
  })),

  endStreaming: () => set({ 
    isStreaming: false, 
    streamingText: '',
    status: 'idle'
  }),

  clearChat: () => set({ 
    conversationId: null, 
    messageIds: [], 
    lastMessageId: null,
    status: 'idle', 
    error: null,
    isStreaming: false,
    streamingText: ''
  }),
}));
