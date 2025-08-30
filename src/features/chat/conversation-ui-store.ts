import { create } from 'zustand';

interface ConversationUIState {
  isConversationOpen: boolean;
  sessionId: string | null;
  openConversation: () => void;
  closeConversation: () => void;
}

export const useConversationUIStore = create<ConversationUIState>((set, get) => ({
  isConversationOpen: false,
  sessionId: null,
  openConversation: (chatId?: string) => {
    // Use chat_id as session ID if provided, otherwise create timestamp-based ID
    const sessionId = chatId || `session_${Date.now()}`;
    console.log('[ConversationUIStore] Opening conversation with session ID:', sessionId);
    set({ isConversationOpen: true, sessionId });
    // Add no-anim class to disable animations
    document.documentElement.classList.add('no-anim');
    // Lock scroll
    document.body.style.overflow = 'hidden';
  },
  closeConversation: () => {
    set({ isConversationOpen: false, sessionId: null });
    // Remove no-anim class to re-enable animations
    document.documentElement.classList.remove('no-anim');
    // Unlock scroll
    document.body.style.overflow = '';
  },
}));
