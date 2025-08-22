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
  ttsVoice?: string;
  lastSendTime?: number;

  startConversation: (id: string) => void;
  loadMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setStatus: (status: ChatStatus) => void;
  setError: (error: string | null) => void;
  setTtsVoice: (v: string) => void;
  clearChat: () => void;
  triggerSend: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chat_id: null,
  messages: [],
  status: 'idle',
  error: null,
  ttsVoice: 'Puck',

  startConversation: (id) => set({ chat_id: id, messages: [], status: 'idle', error: null }),

  loadMessages: (messages) => set({ messages }),

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

  updateMessage: (id, updates) => {
    console.log(`[ChatStore] updateMessage called - ID: ${id}, Updates:`, updates);
    set((state) => {
      const newMessages = state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      );
      console.log(`[ChatStore] Message updated - Before: ${state.messages.find(m => m.id === id)?.text}, After: ${newMessages.find(m => m.id === id)?.text}`);
      return { messages: newMessages };
    });
  },

  setStatus: (status) => set({ status }),
  
  setError: (error) => set({ error, status: error ? 'error' : get().status }),

  setTtsVoice: (v) => set({ ttsVoice: v }),

  clearChat: () => set({ chat_id: null, messages: [], status: 'idle', error: null }),
  
  triggerSend: () => set({ lastSendTime: Date.now() }),
}));
