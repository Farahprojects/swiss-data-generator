import { create } from 'zustand';

interface ConversationUIState {
  isConversationOpen: boolean;
  sessionId: string | null;
  openConversation: () => void;
  closeConversation: () => void;
}

export const useConversationUIStore = create<ConversationUIState>((set) => ({
  isConversationOpen: false,
  sessionId: null,
  openConversation: () => {
    // Create session ID ONCE when conversation opens
    const sessionId = `session_${Date.now()}`;
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
