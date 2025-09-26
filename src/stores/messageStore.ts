import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { unifiedWebSocketService } from '@/services/websocket/UnifiedWebSocketService';
import { useChatStore } from '@/core/store';
import type { Message } from '@/core/types';

// Self-cleaning logic - only clean when explicitly needed
const shouldSelfClean = async (): Promise<boolean> => {
  try {
    // Check if there's a valid auth user (async)
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return true;
    
    // Check if chat_id exists in chat store
    const chatState = useChatStore.getState();
    if (!chatState.chat_id) return true;
    
    return false;
  } catch (error) {
    // If any error checking auth/chat state, assume we should clean
    console.warn('[MessageStore] Error checking auth state:', error);
    return true;
  }
};

interface MessageStore {
  // State
  chat_id: string | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasOlder: boolean;
  latestMessageNumber: number; // Track latest message number for gap detection
  
  // Actions
  setChatId: (id: string | null) => void;
  addMessage: (message: Message) => void;
  addOptimisticMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  fetchMessages: () => Promise<void>;
  loadOlder: () => Promise<void>;
  selfClean: () => void; // Self-cleaning method
  forceResync: () => Promise<void>; // Force resync when gap detected
  handleWebSocketMessage: (message: Message) => void; // Gap detection wrapper
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
  latestMessageNumber: 0,

  // Set chat ID and auto-fetch messages
  setChatId: (id: string | null) => {
    const currentState = get();
    const currentChatId = currentState.chat_id;
    
    // If switching to a different chat_id, clear messages
    // But preserve optimistic messages if they're for the new chat_id
    if (currentChatId !== id) {
      // If setting to null (no user logged in), clear everything
      if (id === null) {
        set({ chat_id: null, messages: [], error: null, hasOlder: false });
        return;
      }
      
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
      // Just fetch messages - WebSocket handles real-time updates
      get().fetchMessages();
    }
  },

      // Self-cleaning method - only clean when explicitly needed
      selfClean: async () => {
        const shouldClean = await shouldSelfClean();
        if (shouldClean) {
          console.log('[MessageStore] Self-cleaning: No auth user or chat_id detected');
          set({ chat_id: null, messages: [], error: null, hasOlder: false });
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
    // Also clear from sessionStorage since we use persist middleware
    sessionStorage.removeItem('therai-message-store');
  },

      // Simple fetch - just get messages, WebSocket handles real-time
      fetchMessages: async () => {
        const { chat_id } = get();
        if (!chat_id) return;

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
      const latestMessage = messages[messages.length - 1];
      set({ 
        messages, 
        loading: false,
        hasOlder: (data?.length || 0) === 50,
        latestMessageNumber: latestMessage?.message_number ?? 0
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

  // Force resync when gap detected
  forceResync: async () => {
    console.log('[MessageStore] Gap detected, forcing resync...');
    await get().fetchMessages();
    const { messages } = get();
    const latestMessage = messages[messages.length - 1];
    set({ latestMessageNumber: latestMessage?.message_number ?? 0 });
  },

  // Gap detection wrapper for WebSocket messages
  handleWebSocketMessage: (message: Message) => {
    const { latestMessageNumber } = get();
    
    // Check for gap in message sequence
    if (message.message_number && message.message_number !== latestMessageNumber + 1) {
      console.log(`[MessageStore] Gap detected: expected ${latestMessageNumber + 1}, got ${message.message_number}`);
      get().forceResync();
      return;
    }
    
    // Update latest message number and add message
    set({ latestMessageNumber: Math.max(latestMessageNumber, message.message_number ?? 0) });
    get().addMessage(message);
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
        latestMessageNumber: state.latestMessageNumber,
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

// Self-cleaning mechanism - only called on auth state changes
export const triggerMessageStoreSelfClean = async () => {
  await useMessageStore.getState().selfClean();
};

// Initialize message store - clear if no authenticated user
if (typeof window !== 'undefined') {
  // Handle rehydration - ensure fresh data on refresh
  const unsubscribe = useMessageStore.subscribe((state) => {
    // Only run once after rehydration
    if (state.chat_id && state.messages.length > 0) {
      console.log('[MessageStore] Rehydration detected, ensuring fresh data...');
      // Force fresh fetch to ensure sync with database
      setTimeout(() => {
        useMessageStore.getState().forceResync();
      }, 100);
      unsubscribe(); // Only run once
    }
  });

  // Check auth state on store initialization
  setTimeout(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // No authenticated user, clear the message store
        console.log('[MessageStore] No authenticated user on init, clearing store');
        useMessageStore.getState().setChatId(null);
      }
    } catch (error) {
      console.warn('[MessageStore] Error checking auth state on init:', error);
      // On error, clear the store to be safe
      useMessageStore.getState().setChatId(null);
    }
  }, 100); // Small delay to ensure auth context is initialized

  // Add event hooks for self-healing
  // Browser focus - resync when user comes back to tab
  window.addEventListener('focus', () => {
    const { chat_id } = useMessageStore.getState();
    if (chat_id) {
      console.log('[MessageStore] Browser focus detected, checking sync...');
      useMessageStore.getState().forceResync();
    }
  });

  // WebSocket close - resync when connection is lost
  window.addEventListener('beforeunload', () => {
    const { chat_id } = useMessageStore.getState();
    if (chat_id) {
      console.log('[MessageStore] Page unload detected, forcing resync...');
      useMessageStore.getState().forceResync();
    }
  });
}
