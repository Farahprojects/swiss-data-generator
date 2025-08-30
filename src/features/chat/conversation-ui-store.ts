import { create } from 'zustand';

interface ConversationUIState {
  isConversationOpen: boolean;
  openConversation: () => void;
  closeConversation: () => void;
}

export const useConversationUIStore = create<ConversationUIState>((set, get) => ({
  isConversationOpen: false,
  openConversation: () => {
    console.log('[ConversationUIStore] Opening conversation');
    set({ isConversationOpen: true });
    // Add no-anim class to disable animations
    document.documentElement.classList.add('no-anim');
    // Lock scroll
    document.body.style.overflow = 'hidden';
  },
  closeConversation: () => {
    set({ isConversationOpen: false });
    // Remove no-anim class to re-enable animations
    document.documentElement.classList.remove('no-anim');
    // Unlock scroll
    document.body.style.overflow = '';
  },
}));
