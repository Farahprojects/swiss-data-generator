import { create } from 'zustand';
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
  validateMessageOrder: () => Promise<void>; // Order validation
  validateMessageCount: () => Promise<void>; // Invisible count validator
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

export const useMessageStore = create<MessageStore>()((set, get) => ({
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
      get().forceResync();
      return;
    }
    
    // Update latest message number and add message
    set({ latestMessageNumber: Math.max(latestMessageNumber, message.message_number ?? 0) });
    get().addMessage(message);
  },

  // Order validation - ensures message sequence integrity
  validateMessageOrder: async () => {
    const { chat_id, messages } = get();
    if (!chat_id || messages.length === 0) return;

    try {
      // Get messages from database in correct order
      const { data: dbMessages, error } = await supabase
        .from('messages')
        .select('id, message_number, created_at')
        .eq('chat_id', chat_id)
        .not('context_injected', 'is', true)
        .order('message_number', { ascending: true });

      if (error) {
        console.warn('[MessageStore] Order validation failed:', error);
        return;
      }

      if (!dbMessages || dbMessages.length === 0) return;

      // Check if store messages are in correct order
      const storeOrder = messages.map(m => ({ id: m.id, message_number: m.message_number, created_at: m.createdAt }));
      const dbOrder = dbMessages.map(m => ({ id: m.id, message_number: m.message_number, created_at: m.created_at }));

      // Compare sequences
      const isOrderCorrect = storeOrder.every((storeMsg, index) => {
        const dbMsg = dbOrder[index];
        return dbMsg && 
               storeMsg.id === dbMsg.id && 
               storeMsg.message_number === dbMsg.message_number;
      });

      // Check for sequence gaps
      const hasSequenceGaps = storeOrder.some((msg, index) => {
        if (index === 0) return false;
        const prevMsg = storeOrder[index - 1];
        return msg.message_number !== prevMsg.message_number + 1;
      });

      // If order is wrong or has gaps, force complete refresh
      if (!isOrderCorrect || hasSequenceGaps) {
        // Refresh messages without temporarily clearing to avoid UI flicker
        await get().fetchMessages();
      }
    } catch (error) {
      console.warn('[MessageStore] Order validation error:', error);
    }
  },

  // Invisible count validator - detects sync issues
  validateMessageCount: async () => {
    const { chat_id, messages } = get();
    if (!chat_id || messages.length === 0) return;

    try {
      // Get actual count from database
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chat_id)
        .not('context_injected', 'is', true); // Exclude system messages

      if (error) {
        console.warn('[MessageStore] Count validation failed:', error);
        return;
      }

      const dbCount = count || 0;
      const storeCount = messages.length;

      // If counts don't match, force complete refresh
      if (dbCount !== storeCount) {
        // Refresh messages without temporarily clearing to avoid UI flicker
        await get().fetchMessages();
      }
    } catch (error) {
      console.warn('[MessageStore] Count validation error:', error);
    }
  },

}));

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
  // Check auth state on store initialization
  setTimeout(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // No authenticated user, clear the message store
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
      useMessageStore.getState().forceResync();
    }
  });

  // WebSocket close - resync when connection is lost
  window.addEventListener('beforeunload', () => {
    const { chat_id } = useMessageStore.getState();
    if (chat_id) {
      useMessageStore.getState().forceResync();
    }
  });

  // Periodic validation - every 30 seconds (order + count)
  setInterval(() => {
    const { chat_id, messages } = useMessageStore.getState();
    if (chat_id && messages.length > 0) {
      useMessageStore.getState().validateMessageOrder();
      useMessageStore.getState().validateMessageCount();
    }
  }, 30000);
}
