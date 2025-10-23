import { create } from 'zustand';

interface ChatStore {
  chat_id: string | null;
  isAssistantTyping: boolean;
  ttsVoice: string;
  pendingInsightThreads: Map<string, any>;
  setAssistantTyping: (typing: boolean) => void;
  addThread: (userId: string, mode: string, title: string, reportData?: any) => Promise<string>;
  removeThread: (chatId: string) => void;
  clearChat: () => void;
  setState: (state: Partial<ChatStore>) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chat_id: null,
  isAssistantTyping: false,
  ttsVoice: 'Puck',
  pendingInsightThreads: new Map(),
  
  setAssistantTyping: (typing) => set({ isAssistantTyping: typing }),
  
  addThread: async (userId, mode, title, reportData) => {
    // Stub implementation - replace with your actual logic
    console.warn('useChatStore.addThread is a stub - replace with actual implementation');
    const newId = crypto.randomUUID();
    set({ chat_id: newId });
    return newId;
  },
  
  removeThread: (chatId) => {
    console.warn('useChatStore.removeThread is a stub - replace with actual implementation');
    if (get().chat_id === chatId) {
      set({ chat_id: null });
    }
  },
  
  clearChat: () => {
    console.warn('useChatStore.clearChat is a stub - replace with actual implementation');
    set({ chat_id: null });
  },
  
  setState: (state) => set(state),
}));
