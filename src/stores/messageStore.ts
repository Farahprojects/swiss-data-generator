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
  
  // Actions
  setChatId: (id: string | null) => void;
  addMessage: (message: Message) => void;
  addOptimisticMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  fetchMessages: () => Promise<void>;
  fetchLatestAssistantMessage: (chat_id: string) => Promise<void>;
  loadOlder: () => Promise<void>;
  selfClean: () => void;
}

const mapDbToMessage = (db: any): Message => ({
  id: db.id,
  chat_id: db.chat_id,
  role: db.role,
  text: db.text,
  user_id: db.user_id,
  user_name: db.user_name,
  createdAt: db.created_at,
  meta: db.meta,
  client_msg_id: db.client_msg_id,
  status: db.status,
  context_injected: db.context_injected,
  message_number: db.message_number,
  source: 'fetch', // All DB-fetched messages are explicitly 'fetch' - no animation
});

export const useMessageStore = create<MessageStore>()((set, get) => ({
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
    
    
    // If switching to a different chat_id, clear messages
    // But preserve optimistic messages if they're for the new chat_id
    if (currentChatId !== id) {
      // If setting to null (no user logged in), clear everything
      if (id === null) {
        console.log('[MessageStore] Setting to null, clearing all');
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

      // Add message with deduplication and timestamp ordering
      addMessage: (message: Message) => {
        set((state) => {
      
      // Check if message already exists by id
      const exists = state.messages.some(m => m.id === message.id);
      
      if (exists) {
        // Update existing - preserve WebSocket source
        const updatedMessages = state.messages.map(m => {
          if (m.id === message.id) {
            return { 
              ...m, 
              ...message, 
              pending: false,
              source: message.source || m.source
            };
          }
          return m;
        });
        return { messages: updatedMessages };
      }
      
      // Add new message and sort by timestamp
      const newMessages = [...state.messages, message];
      newMessages.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      return { messages: newMessages };
    });
  },

      // Add optimistic message with current timestamp
      addOptimisticMessage: (message: Message) => {
        set((state) => {
      
      const optimisticMessage = {
        ...message,
        pending: true,
        tempId: message.id, // Keep original ID for reconciliation
        source: 'fetch' as const // Optimistic messages don't animate (user's own text)
      };
      
      // Add optimistic message and sort by timestamp
      const newMessages = [...state.messages, optimisticMessage];
      newMessages.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      return { messages: newMessages };
    });
  },

  // Update existing message - preserve source field
  updateMessage: (id: string, updates: Partial<Message>) => {
    set((state) => ({
      messages: state.messages.map(m => 
        m.id === id 
          ? { ...m, ...updates, source: updates.source || m.source } // Preserve source
          : m
      )
    }));
  },

  // Clear all messages
  clearMessages: () => {
    set({ messages: [], error: null });
  },

      // Simple fetch - just get messages, WebSocket handles real-time
      fetchMessages: async () => {
        const { chat_id, messages: currentMessages } = get();
        if (!chat_id) {
          console.log('[MessageStore] fetchMessages: No chat_id, skipping');
          return;
        }


    set({ loading: true, error: null });

    try {
      // Determine auth context once for scoping
      const { data: authData } = await supabase.auth.getUser();
      const authUserId = authData?.user?.id;

      // FIRST: Validate conversation exists in DB (prevents stale chat_id) for authed users only
      // Public viewers don't own a row in conversations yet; skip this check for them
      let conversationCheck: any = true;
      let checkError: any = null;
      if (authUserId) {
        // Check if user is a participant in this conversation
        const { data, error } = await supabase
          .from('conversations_participants')
          .select('conversation_id')
          .eq('conversation_id', chat_id)
          .eq('user_id', authUserId)
          .maybeSingle();
        conversationCheck = data;
        checkError = error;
      }
      
      if (checkError) {
        console.error('[MessageStore] Error checking conversation:', checkError);
        throw checkError;
      }
      
      if (!conversationCheck) {
        console.warn('[MessageStore] ⚠️ Conversation not found in DB (stale chat_id), cleaning up');
        // Conversation was deleted or never existed - clear everything
        set({ 
          chat_id: null, 
          messages: [], 
          loading: false, 
          error: null,
          hasOlder: false
        });
        // Clear from sessionStorage too
        sessionStorage.removeItem('chat_id');
        localStorage.removeItem('chat_id');
        return;
      }
      

      // NOW: Fetch messages since conversation is valid
      const { data, error } = await supabase
        .from('messages')
        .select('id, chat_id, role, text, created_at, meta, client_msg_id, status, context_injected, message_number, user_id, user_name')
        .eq('chat_id', chat_id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;


      const messages = (data || []).map(mapDbToMessage);
      
      
      set({ 
        messages, 
        loading: false,
        hasOlder: (data?.length || 0) === 50
      });
      
    } catch (e: any) {
      console.error('[MessageStore] Failed to fetch messages:', e.message, e);
      set({ error: e.message, loading: false });
    }
  },

  // Fetch latest assistant message from DB (WebSocket notification trigger)
  fetchLatestAssistantMessage: async (chat_id: string) => {
    if (!chat_id) return;

    console.log('[MessageStore] fetchLatestAssistantMessage:', { chat_id });

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, chat_id, role, text, created_at, meta, client_msg_id, status, context_injected, message_number, user_id, user_name')
        .eq('chat_id', chat_id)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // If no rows, that's ok - message might not be replicated yet
        if (error.code === 'PGRST116') {
          console.log('[MessageStore] Assistant message not in DB yet, will arrive on next broadcast');
          return;
        }
        throw error;
      }

      if (data) {
        console.log('[MessageStore] Found assistant message:', { 
          id: data.id,
          text_preview: data.text?.substring(0, 50) 
        });
        
        const message = mapDbToMessage(data);
        // Mark as WebSocket source for animation
        const messageWithSource = { ...message, source: 'websocket' as const };
        
        // Check if we already have this message by ID
        const { messages } = get();
        const exists = messages.some(m => m.id === data.id);
        
        console.log('[MessageStore] Message exists in store?', exists);
        
        if (!exists) {
          console.log('[MessageStore] Adding new assistant message to store');
          useMessageStore.getState().addMessage(messageWithSource);
          console.log('[MessageStore] Store now has', get().messages.length, 'messages');
        } else {
          console.log('[MessageStore] Message already in store, skipping');
        }
      }
    } catch (e: any) {
      console.error('[MessageStore] Failed to fetch latest assistant message:', e.message, e);
    }
  },



  // Load older messages (use timestamp ordering)
  loadOlder: async () => {
    const { chat_id, messages } = get();
    if (!chat_id || messages.length === 0) return;

    const oldestMessage = messages[0];
    if (!oldestMessage?.createdAt) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, chat_id, role, text, created_at, meta, client_msg_id, status, context_injected, message_number, user_id, user_name')
        .eq('chat_id', chat_id)
        .lt('created_at', oldestMessage.createdAt)
        .order('created_at', { ascending: true })
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

// Initialize message store - listen for WebSocket events
if (typeof window !== 'undefined') {
  // Listen for message events from WebSocket
  window.addEventListener('assistant-message', async (event: any) => {
    const { chat_id, role } = event.detail;
    console.log('[MessageStore] 🔔 Assistant message event received:', { 
      event_chat_id: chat_id,
      role
    });
    
    // Fetch from DB (source of truth)
    const { fetchLatestAssistantMessage, chat_id: currentChatId, messages } = useMessageStore.getState();
    
    console.log('[MessageStore] Current store state:', { 
      currentChatId, 
      messageCount: messages.length,
      matchesEvent: chat_id === currentChatId 
    });
    
    // Only fetch if this is for the current chat
    if (chat_id === currentChatId) {
      console.log('[MessageStore] Chat IDs match, fetching latest message');
      if (role === 'assistant') {
        await fetchLatestAssistantMessage(chat_id);
      } else {
        // Fetch latest user message
        try {
          const { data, error } = await supabase
            .from('messages')
            .select('id, chat_id, role, text, created_at, meta, client_msg_id, status, context_injected, message_number, user_id, user_name')
            .eq('chat_id', chat_id)
            .eq('role', 'user')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!error && data) {
            const message = mapDbToMessage(data);
            const messageWithSource = { ...message, source: 'websocket' as const };
            const { messages } = useMessageStore.getState();
            const exists = messages.some(m => m.id === data.id);
            if (!exists) {
              useMessageStore.getState().addMessage(messageWithSource);
            }
          }
        } catch (e) {
          console.error('[MessageStore] Failed to fetch latest user message', e);
        }
      }
      
      // Handle side-effects
      const { setAssistantTyping } = useChatStore.getState();
      setAssistantTyping(false);
      
      // Remove pending status from user messages
      const { messages: updatedMessages, updateMessage } = useMessageStore.getState();
      console.log('[MessageStore] Clearing pending flags on', updatedMessages.length, 'messages');
      updatedMessages.forEach(userMsg => {
        if (userMsg.role === 'user' && userMsg.pending) {
          updateMessage(userMsg.id, { pending: false });
        }
      });
    } else {
      console.log('[MessageStore] Chat ID mismatch, ignoring event');
    }
  });
}
