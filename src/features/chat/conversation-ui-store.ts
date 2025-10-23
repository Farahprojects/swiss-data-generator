import { create } from 'zustand';

interface ConversationUIStore {
  isTyping: boolean;
  isConversationOpen: boolean;
  setTyping: (typing: boolean) => void;
  setConversationOpen: (open: boolean) => void;
}

export const useConversationUIStore = create<ConversationUIStore>((set) => ({
  isTyping: false,
  isConversationOpen: false,
  setTyping: (typing) => set({ isTyping: typing }),
  setConversationOpen: (open) => set({ isConversationOpen: open }),
}));
