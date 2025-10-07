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
  fetchLatestAssistantMessage: (chat_id: string) => Promise<void>; // Fetch single latest assistant message
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
  source: 'fetch', // All DB-fetched messages are explicitly 'fetch' - no animation
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
    
    console.log('[MessageStore] setChatId called:', { 
      from: currentChatId, 
      to: id, 
      currentMessageCount: currentState.messages.length 
    });
    
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
      
      console.log('[MessageStore] Switching chats:', { 
        optimisticCount: optimisticMessages.length, 
        shouldPreserve: shouldPreserveOptimistic 
      });
      
      if (shouldPreserveOptimistic) {
        // Keep optimistic messages for the new chat_id
        set({ chat_id: id, messages: optimisticMessages, error: null });
      } else {
        // Clear all messages when switching chats
        console.log('[MessageStore] Clearing messages for new chat');
        set({ chat_id: id, messages: [], error: null });
      }
    } else {
      console.log('[MessageStore] Same chat_id, not clearing messages');
    }
    
    if (id) {
      // Just fetch messages - WebSocket handles real-time updates
      console.log('[MessageStore] Triggering fetchMessages for:', id);
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
        // Update existing - CRITICAL: Preserve WebSocket source if incoming message has it
        const updatedMessages = state.messages.map(m => {
          if (m.message_number === message.message_number || m.id === message.id) {
            // WebSocket source always wins (for animations), otherwise preserve existing
            return { 
              ...m, 
              ...message, 
              pending: false,
              source: message.source || m.source // Incoming source takes priority
            };
          }
          return m;
        });
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
        tempId: message.id, // Keep original ID for reconciliation
        source: 'fetch' as const // Optimistic messages don't animate (user's own text)
      };
      
      // Add optimistic message and sort
      const newMessages = [...state.messages, optimisticMessage];
      newMessages.sort((a, b) => (a.message_number ?? 0) - (b.message_number ?? 0));
      
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

    console.log('[MessageStore] fetchMessages START:', { 
      chat_id, 
      currentMessageCount: currentMessages.length 
    });

    set({ loading: true, error: null });

    try {
      // FIRST: Validate conversation exists in DB (prevents stale chat_id)
      console.log('[MessageStore] Validating conversation exists:', chat_id);
      const { data: conversationCheck, error: checkError } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', chat_id)
        .maybeSingle();
      
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
          hasOlder: false,
          latestMessageNumber: 0
        });
        // Clear from sessionStorage too
        sessionStorage.removeItem('chat_id');
        localStorage.removeItem('chat_id');
        return;
      }
      
      console.log('[MessageStore] ✓ Conversation exists, fetching messages');

      // NOW: Fetch messages since conversation is valid
      const { data, error } = await supabase
        .from('messages')
        .select('id, chat_id, role, text, created_at, meta, client_msg_id, status, context_injected, message_number')
        .eq('chat_id', chat_id)
        .order('message_number', { ascending: true })
        .limit(50);

      if (error) throw error;

      console.log('[MessageStore] fetchMessages DB response:', { 
        chat_id,
        rowCount: data?.length || 0,
        roles: data?.map(m => m.role) || []
      });

      const messages = (data || []).map(mapDbToMessage);
      const latestMessage = messages[messages.length - 1];
      
      console.log('[MessageStore] fetchMessages SETTING state:', { 
        messageCount: messages.length,
        latestMessageNumber: latestMessage?.message_number ?? 0,
        messageIds: messages.map(m => m.id)
      });
      
      set({ 
        messages, 
        loading: false,
        hasOlder: (data?.length || 0) === 50,
        latestMessageNumber: latestMessage?.message_number ?? 0
      });
      
      console.log('[MessageStore] fetchMessages COMPLETE:', { 
        finalCount: get().messages.length 
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
        .select('id, chat_id, role, text, created_at, meta, client_msg_id, status, context_injected, message_number')
        .eq('chat_id', chat_id)
        .eq('role', 'assistant')
        .order('message_number', { ascending: false })
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
          message_number: data.message_number,
          text_preview: data.text?.substring(0, 50) 
        });
        
        const message = mapDbToMessage(data);
        // Mark as WebSocket source for animation
        const messageWithSource = { ...message, source: 'websocket' as const };
        
        // Check if we already have this message
        const { messages } = get();
        const exists = messages.some(m => m.id === data.id || m.message_number === data.message_number);
        
        console.log('[MessageStore] Message exists in store?', exists);
        
        if (!exists) {
          console.log('[MessageStore] Adding new assistant message to store');
          get().addMessage(messageWithSource);
          
          // Update latest message number
          const { messages: updatedMessages } = get();
          const latestMessage = updatedMessages[updatedMessages.length - 1];
          set({ latestMessageNumber: latestMessage?.message_number ?? 0 });
          
          console.log('[MessageStore] Store now has', updatedMessages.length, 'messages');
        } else {
          console.log('[MessageStore] Message already in store, skipping');
        }
      }
    } catch (e: any) {
      console.error('[MessageStore] Failed to fetch latest assistant message:', e.message, e);
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
    // Preserve WebSocket messages that might not be in DB yet (replication lag)
    const { messages: currentMessages } = get();
    const recentWebSocketMessages = currentMessages.filter(m => 
      m.source === 'websocket' && 
      Date.now() - new Date(m.createdAt).getTime() < 5000 // Last 5 seconds
    );
    
    await get().fetchMessages();
    
    // Re-add recent WebSocket messages if they're missing from fetch
    const { messages: fetchedMessages } = get();
    recentWebSocketMessages.forEach(wsMessage => {
      const exists = fetchedMessages.some(m => m.id === wsMessage.id || m.message_number === wsMessage.message_number);
      if (!exists) {
        get().addMessage(wsMessage);
      }
    });
    
    const { messages } = get();
    const latestMessage = messages[messages.length - 1];
    set({ latestMessageNumber: latestMessage?.message_number ?? 0 });
  },

  // Gap detection wrapper for WebSocket messages
  handleWebSocketMessage: (message: Message) => {
    const { latestMessageNumber } = get();
    
    // ALWAYS ensure WebSocket messages have source='websocket' for animations
    const messageWithSource = { ...message, source: 'websocket' as const };
    
    // Check for gap in message sequence
    if (message.message_number && message.message_number !== latestMessageNumber + 1) {
      // Add this WebSocket message FIRST (with animation)
      set({ latestMessageNumber: Math.max(latestMessageNumber, message.message_number ?? 0) });
      get().addMessage(messageWithSource);
      
      // Resync after a delay to allow DB replication to catch up
      // This prevents the "flash and disappear" issue where broadcast arrives before DB SELECT returns the message
      setTimeout(() => {
        get().forceResync();
      }, 500); // 500ms delay for DB replication
      return;
    }
    
    // Update latest message number and add message with WebSocket source
    set({ latestMessageNumber: Math.max(latestMessageNumber, message.message_number ?? 0) });
    get().addMessage(messageWithSource);
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

// Initialize message store - listen for WebSocket events
if (typeof window !== 'undefined') {
  // Listen for assistant message events from WebSocket
  window.addEventListener('assistant-message', async (event: any) => {
    const { chat_id } = event.detail;
    console.log('[MessageStore] 🔔 Assistant message event received:', { 
      event_chat_id: chat_id 
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
      console.log('[MessageStore] Chat IDs match, fetching latest assistant message');
      await fetchLatestAssistantMessage(chat_id);
      
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
