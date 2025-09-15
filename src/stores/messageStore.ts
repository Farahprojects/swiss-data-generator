import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { unifiedWebSocketService } from '@/services/websocket/UnifiedWebSocketService';
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
  fetchMessagesWithFallback: () => Promise<void>;
  fetchMessagesViaWebSocket: () => Promise<void>;
  fetchMessagesDirect: () => Promise<void>;
  loadOlder: () => Promise<void>;
  setupRealtimeSubscription: () => void;
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

export const useMessageStore = create<MessageStore>((set, get) => ({
  // Initial state
  chat_id: null,
  messages: [],
  loading: false,
  error: null,
  hasOlder: false,

  // Set chat ID and auto-fetch messages
  setChatId: (id: string | null) => {
    set({ chat_id: id, messages: [], error: null });
    if (id) {
      get().fetchMessagesWithFallback();
    }
  },

  // Add message with deduplication by message_number and optimistic handling
  addMessage: (message: Message) => {
    set((state) => {
      // Check if message already exists by message_number
      const exists = state.messages.some(m => m.message_number === message.message_number);
      if (exists) {
        console.log('[MessageStore] Updating existing message:', message.message_number);
        // Update existing message (remove pending status if it was optimistic)
        const updatedMessages = state.messages.map(m => 
          m.message_number === message.message_number 
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
      
      console.log('[MessageStore] Adding optimistic message:', nextOptimisticNumber);
      
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

  // Fetch messages with WebSocket fallback to direct Supabase
  fetchMessagesWithFallback: async () => {
    const { chat_id } = get();
    if (!chat_id) return;

    set({ loading: true, error: null });
    
    try {
      // Try WebSocket first
      console.log('[MessageStore] Trying WebSocket for messages...');
      await get().fetchMessagesViaWebSocket();
      
      // Set up fallback timer
      const fallbackTimer = setTimeout(() => {
        console.log('[MessageStore] WebSocket timeout, falling back to direct Supabase...');
        get().fetchMessagesDirect();
      }, 3000); // 3 second timeout
      
      // Clear timer if WebSocket succeeds quickly
      const originalMessages = get().messages;
      const checkSuccess = () => {
        if (get().messages.length > originalMessages.length) {
          clearTimeout(fallbackTimer);
          console.log('[MessageStore] WebSocket succeeded, canceling fallback');
        }
      };
      
      // Check after 100ms
      setTimeout(checkSuccess, 100);
      
    } catch (e: any) {
      console.log('[MessageStore] WebSocket failed, falling back to direct Supabase...');
      await get().fetchMessagesDirect();
    }
  },

  // Fetch messages via WebSocket
  fetchMessagesViaWebSocket: async () => {
    const { chat_id } = get();
    if (!chat_id) return;

    // Initialize WebSocket connection for message fetching
    await unifiedWebSocketService.initialize(chat_id, {
      onMessage: (message: Message) => {
        console.log('[MessageStore] WebSocket message received:', message.message_number);
        get().addMessage(message);
      },
      onError: (error: string) => {
        console.error('[MessageStore] WebSocket error:', error);
        set({ error });
      }
    });
    
    set({ loading: false });
  },

  // Fetch messages directly from Supabase (fallback)
  fetchMessagesDirect: async () => {
    const { chat_id } = get();
    if (!chat_id) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, chat_id, role, text, created_at, meta, client_msg_id, status, context_injected, message_number')
        .eq('chat_id', chat_id)
        .order('message_number', { ascending: true })
        .limit(50);

      if (error) throw error;

      const messages = (data || []).map(mapDbToMessage);
      set({ 
        messages, 
        loading: false,
        hasOlder: (data?.length || 0) === 50
      });
      
      // Also set up direct real-time subscription as fallback
      get().setupRealtimeSubscription();
      
    } catch (e: any) {
      set({ 
        error: e?.message || 'Failed to load messages', 
        loading: false 
      });
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

  // Setup realtime subscription
  setupRealtimeSubscription: () => {
    const { chat_id } = get();
    if (!chat_id) return;

    // Clean up existing subscription
    const existingChannel = (useMessageStore as any)._channel;
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase
      .channel(`messages-${chat_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chat_id}`
      }, (payload) => {
        const newMessage = mapDbToMessage(payload.new);
        console.log('[MessageStore] Real-time INSERT:', newMessage.message_number);
        get().addMessage(newMessage);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chat_id}`
      }, (payload) => {
        const updatedMessage = mapDbToMessage(payload.new);
        console.log('[MessageStore] Real-time UPDATE:', updatedMessage.id);
        get().updateMessage(updatedMessage.id, updatedMessage);
      })
      .subscribe();

    // Store channel reference for cleanup
    (useMessageStore as any)._channel = channel;
  }
}));

// Cleanup function
export const cleanupMessageStore = () => {
  const channel = (useMessageStore as any)._channel;
  if (channel) {
    supabase.removeChannel(channel);
    (useMessageStore as any)._channel = null;
  }
};
