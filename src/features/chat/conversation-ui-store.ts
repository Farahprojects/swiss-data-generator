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
    // Add no-anim class to disable animations
    document.documentElement.classList.add('no-anim');
    // Lock scroll
    document.body.style.overflow = 'hidden';
    
    // Log conversation opening
    console.log('🎯 [FLOW MONITOR] 🚪 Conversation UI: Opening conversation modal');
  },
  closeConversation: () => {
    set({ isConversationOpen: false });
    // Remove no-anim class to re-enable animations
    document.documentElement.classList.remove('no-anim');
    // Unlock scroll
    document.body.style.overflow = '';
    
    // Log conversation closing
    console.log('🎯 [FLOW MONITOR] 🚪 Conversation UI: Closing conversation modal');
  },
}));
