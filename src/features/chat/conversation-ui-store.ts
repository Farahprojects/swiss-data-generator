import { create } from 'zustand';

interface ConversationUIState {
  isConversationOpen: boolean;
  openConversation: () => void;
  closeConversation: () => void;
}

export const useConversationUIStore = create<ConversationUIState>((set) => ({
  isConversationOpen: false,
  openConversation: () => set({ isConversationOpen: true }),
  closeConversation: () => set({ isConversationOpen: false }),
}));
