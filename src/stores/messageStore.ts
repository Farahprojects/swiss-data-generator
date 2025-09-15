import { create } from 'zustand';
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
  wsConnected: boolean;
  wsInitialized: boolean;
  
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
  initializeWebSocket: () => Promise<void>;
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
  wsConnected: false,
  wsInitialized: false,

  // Set chat ID and auto-fetch messages
  setChatId: (id: string | null) => {
    set({ chat_id: id, messages: [], error: null });
    if (id) {
      // Initialize WebSocket early if not already done
      if (!get().wsInitialized) {
        get().initializeWebSocket();
      }
      // Fetch messages with proper fallback strategy
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

    // Flip stop button back to wave icon when assistant message appears
    if (message.role === 'assistant') {
      const { setAssistantTyping } = useChatStore.getState();
      setAssistantTyping(false);
    }
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

  // Initialize WebSocket early and keep it hot
  initializeWebSocket: async () => {
    if (get().wsInitialized) return;
    
    set({ wsInitialized: true });
    console.log('[MessageStore] Initializing WebSocket early...');
    
    try {
      await unifiedWebSocketService.initialize(
        (message) => {
          console.log('[MessageStore] WebSocket message received:', message);
          get().addMessage(message);
          set({ wsConnected: true });
        },
        (error) => {
          console.warn('[MessageStore] WebSocket error:', error);
          set({ wsConnected: false, error });
        }
      );
      set({ wsConnected: true });
    } catch (e: any) {
      console.warn('[MessageStore] WebSocket initialization failed:', e.message);
      set({ wsConnected: false, error: e.message });
    }
  },

  // Smart fetch: Use hot WebSocket if available, otherwise direct fetch
  fetchMessagesWithFallback: async () => {
    const { chat_id, wsConnected } = get();
    if (!chat_id) return;

    set({ loading: true, error: null });

    try {
      if (wsConnected) {
        console.log('[MessageStore] Using hot WebSocket for messages...');
        await get().fetchMessagesViaWebSocket();
      } else {
        console.log('[MessageStore] WebSocket not connected, using direct fetch...');
        await get().fetchMessagesDirect();
      }
    } catch (e: any) {
      console.warn('[MessageStore] Primary fetch failed, trying direct fallback:', e.message);
      await get().fetchMessagesDirect();
    }
  },

  // Fetch messages via hot WebSocket connection
  fetchMessagesViaWebSocket: async () => {
    const { chat_id, wsConnected } = get();
    if (!chat_id) return;

    if (!wsConnected) {
      throw new Error('WebSocket not connected');
    }

    try {
      // Use the already hot WebSocket connection
      console.log('[MessageStore] Subscribing to chat via hot WebSocket...');
      
      // Subscribe to this specific chat using the hot connection
      await unifiedWebSocketService.subscribeToChat(chat_id);
      
      set({ loading: false });
    } catch (e: any) {
      set({ 
        error: `WebSocket fetch failed: ${e.message}`,
        loading: false 
      });
      throw e;
    }
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

  // Setup realtime subscription (now handled by WebSocket service)
  setupRealtimeSubscription: () => {
    // This method is now handled by the WebSocket service
    // No need to duplicate the subscription logic
    console.log('[MessageStore] Realtime subscription handled by WebSocket service');
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
