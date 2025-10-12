import { create } from 'zustand';

interface ConversationUIState {
  isConversationOpen: boolean;
  openConversation: () => void;
  closeConversation: () => void;
}

export const useConversationUIStore = create<ConversationUIState>((set) => ({
  isConversationOpen: false,
  openConversation: () => {
    set({ isConversationOpen: true });
    // Lock scroll
    document.body.style.overflow = 'hidden';
  },
  closeConversation: () => {
    set({ isConversationOpen: false });
    // Unlock scroll
    document.body.style.overflow = '';
  },
}));
