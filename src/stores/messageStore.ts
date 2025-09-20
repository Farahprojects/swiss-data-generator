import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { unifiedWebSocketService } from '@/services/websocket/UnifiedWebSocketService';
import { useChatStore } from '@/core/store';
import type { Message } from '@/core/types';

interface MessageStore {
  // State
  chat_id: string | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasOlder: boolean;
  
  // Actions
  setChatId: (id: string | null) => void;
  addMessage: (message: Message) => void;
  addOptimisticMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  fetchMessages: () => Promise<void>;
  loadOlder: () => Promise<void>;
}

const mapDbToMessage = (db: any): Message => ({
  id: db.id,
  chat_id: db.chat_id,
  role: db.role,
  text: db.text,
  createdAt: db.created_at,
  meta: db.meta,
  client_msg_id: db.client_msg_id,
  status: db.status,
  context_injected: db.context_injected,
  message_number: db.message_number,
});

export const useMessageStore = create<MessageStore>()(
  persist(
    (set, get) => ({
  // Initial state
  chat_id: null,
  messages: [],
  loading: false,
  error: null,
  hasOlder: false,

  // Set chat ID and auto-fetch messages
  setChatId: (id: string | null) => {
    const currentState = get();
    const currentChatId = currentState.chat_id;
    
    console.log('[MessageStore] setChatId called:', { from: currentChatId, to: id });
    
    // If switching to a different chat_id, clear messages
    // But preserve optimistic messages if they're for the new chat_id
    if (currentChatId !== id) {
      const optimisticMessages = currentState.messages.filter(m => m.status === 'thinking');
      const shouldPreserveOptimistic = optimisticMessages.some(m => m.chat_id === id);
      
      if (shouldPreserveOptimistic) {
        // Keep optimistic messages for the new chat_id
        set({ chat_id: id, messages: optimisticMessages, error: null });
      } else {
        // Clear all messages when switching chats
        set({ chat_id: id, messages: [], error: null });
      }
    }
    
    if (id) {
      console.log('[MessageStore] About to fetch messages for chat_id:', id);
      // Just fetch messages - WebSocket handles real-time updates
      get().fetchMessages();
    }
  },

  // Add message with deduplication by message_number and optimistic handling
  addMessage: (message: Message) => {
    set((state) => {
      
      // Check if message already exists by message_number or id
      const exists = state.messages.some(m => 
        m.message_number === message.message_number || 
        m.id === message.id
      );
      if (exists) {
        // Update existing message (remove pending status if it was optimistic)
        const updatedMessages = state.messages.map(m => 
          (m.message_number === message.message_number || m.id === message.id)
            ? { ...m, ...message, pending: false }
            : m
        );
        return { messages: updatedMessages };
      }
      
      // Add new message and sort by message_number
      const newMessages = [...state.messages, message];
      newMessages.sort((a, b) => (a.message_number ?? 0) - (b.message_number ?? 0));
      
      return { messages: newMessages };
    });
  },

  // Add optimistic message with temporary number for instant UI
  addOptimisticMessage: (message: Message) => {
    set((state) => {
      // Get next optimistic number
      const currentMax = state.messages.reduce((max, m) => Math.max(max, m.message_number ?? 0), 0);
      const nextOptimisticNumber = currentMax + 1;
      
      const optimisticMessage = {
        ...message,
        message_number: nextOptimisticNumber,
        pending: true,
        tempId: message.id // Keep original ID for reconciliation
      };
      
      // Add optimistic message and sort
      const newMessages = [...state.messages, optimisticMessage];
      newMessages.sort((a, b) => (a.message_number ?? 0) - (b.message_number ?? 0));
      
      return { messages: newMessages };
    });
  },

  // Update existing message
  updateMessage: (id: string, updates: Partial<Message>) => {
    set((state) => ({
      messages: state.messages.map(m => m.id === id ? { ...m, ...updates } : m)
    }));
  },

  // Clear all messages
  clearMessages: () => {
    set({ messages: [], error: null });
  },

  // Simple fetch - just get messages, WebSocket handles real-time
  fetchMessages: async () => {
    const { chat_id } = get();
    if (!chat_id) {
      console.log('[MessageStore] fetchMessages: No chat_id, skipping fetch');
      return;
    }

    console.log('[MessageStore] fetchMessages: Starting fetch for chat_id:', chat_id);
    set({ loading: true, error: null });

    try {
      
      const { data, error } = await supabase
        .from('messages')
        .select('id, chat_id, role, text, created_at, meta, client_msg_id, status, context_injected, message_number')
        .eq('chat_id', chat_id)
        .order('message_number', { ascending: true })
        .limit(50);

      if (error) throw error;

      const messages = (data || []).map(mapDbToMessage);
      console.log('[MessageStore] fetchMessages: Fetched', messages.length, 'messages for chat_id:', chat_id);
      set({ 
        messages, 
        loading: false,
        hasOlder: (data?.length || 0) === 50
      });
    } catch (e: any) {
      console.warn('[MessageStore] Failed to fetch messages:', e.message);
      set({ error: e.message, loading: false });
    }
  },



  // Load older messages
  loadOlder: async () => {
    const { chat_id, messages } = get();
    if (!chat_id || messages.length === 0) return;

    const oldestMessage = messages[0];
    if (!oldestMessage?.message_number) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, chat_id, role, text, created_at, meta, client_msg_id, status, context_injected, message_number')
        .eq('chat_id', chat_id)
        .lt('message_number', oldestMessage.message_number)
        .order('message_number', { ascending: true })
        .limit(50);

      if (error) throw error;

      const olderMessages = (data || []).map(mapDbToMessage);
      set((state) => ({
        messages: [...olderMessages, ...state.messages],
        hasOlder: (data?.length || 0) === 50
      }));
    } catch (e: any) {
      console.error('[MessageStore] Failed to load older messages:', e);
    }
  },

}),
    {
      name: 'therai-message-store',
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name);
        },
      },
      // Only persist essential state, not loading states or functions
      partialize: (state: MessageStore) => ({
        chat_id: state.chat_id,
        messages: state.messages,
        error: state.error,
        hasOlder: state.hasOlder,
        loading: state.loading,
      } as Partial<MessageStore>),
    }
  )
);

// Cleanup function
export const cleanupMessageStore = () => {
  const channel = (useMessageStore as any)._channel;
  if (channel) {
    supabase.removeChannel(channel);
    (useMessageStore as any)._channel = null;
  }
};
