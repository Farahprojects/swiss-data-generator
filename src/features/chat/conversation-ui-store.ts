import { create } from 'zustand';

interface ConversationUIState {
  isConversationOpen: boolean;
  chat_id: string | null;
  openConversation: () => void;
  closeConversation: () => void;
}

export const useConversationUIStore = create<ConversationUIState>((set, get) => ({
  isConversationOpen: false,
  chat_id: null,
  openConversation: (chatId?: string) => {
    // Use chat_id directly
    const chat_id = chatId || `chat_${Date.now()}`;
    console.log('[ConversationUIStore] Opening conversation with chat_id:', chat_id);
    set({ isConversationOpen: true, chat_id });
    // Add no-anim class to disable animations
    document.documentElement.classList.add('no-anim');
    // Lock scroll
    document.body.style.overflow = 'hidden';
  },
  closeConversation: () => {
    set({ isConversationOpen: false, chat_id: null });
    // Remove no-anim class to re-enable animations
    document.documentElement.classList.remove('no-anim');
    // Unlock scroll
    document.body.style.overflow = '';
  },
}));
