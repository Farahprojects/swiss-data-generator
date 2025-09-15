import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
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
      get().fetchMessages();
      get().setupRealtimeSubscription();
    }
  },

  // Add message with deduplication by message_number
  addMessage: (message: Message) => {
    set((state) => {
      // Check if message already exists by message_number
      const exists = state.messages.some(m => m.message_number === message.message_number);
      if (exists) {
        console.log('[MessageStore] Ignoring duplicate message:', message.message_number);
        return state;
      }
      
      // Add message and sort by message_number
      const newMessages = [...state.messages, message];
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

  // Fetch messages from database
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
      set({ 
        messages, 
        loading: false,
        hasOlder: (data?.length || 0) === 50
      });
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
