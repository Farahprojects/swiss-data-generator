import { create } from 'zustand';
import { Message } from '@/core/types';

interface MessageStore {
  messages: Message[];
  chat_id: string | null;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
  messages: [],
  chat_id: null,
  
  addMessage: (message) => {
    console.warn('useMessageStore.addMessage is a stub - replace with actual implementation');
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },
  
  clearMessages: () => {
    set({ messages: [] });
  },
}));
