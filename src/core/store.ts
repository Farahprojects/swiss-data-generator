import { create } from 'zustand';
import { Message } from './types';
import { Conversation } from '@/services/conversations';
import { useMessageStore } from '@/stores/messageStore';
import { supabase } from '@/integrations/supabase/client';

export type ChatStatus =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'error'
  | 'loading_messages';

interface ChatState {
  // Current active chat
  chat_id: string | null;
  // Messages moved to useMessageStore - single source of truth
  status: ChatStatus;
  error: string | null;
  ttsVoice?: string;
  isLoadingMessages: boolean;
  messageLoadError: string | null;
  lastMessagesFetch: number | null;
  isAssistantTyping: boolean;
  isPaymentFlowStopIcon: boolean;

  // Thread management (single source of truth)
  threads: Conversation[];
  isLoadingThreads: boolean;
  threadsError: string | null;
  pendingInsightThreads: Map<string, { reportType: string; timestamp: number }>;
  
  // Real-time sync state
  conversationChannel: any;
  isConversationSyncActive: boolean;

  // Chat actions (authenticated users only)
  startConversation: (chat_id: string) => void;
  startNewConversation: (user_id?: string) => Promise<string>;
  // Message management moved to useMessageStore - single source of truth
  setStatus: (status: ChatStatus) => void;
  setError: (error: string | null) => void;
  setTtsVoice: (v: string) => void;
  clearChat: () => void;
  clearAllData: () => void;
  setLoadingMessages: (loading: boolean) => void;
  setMessageLoadError: (error: string | null) => void;
  retryLoadMessages: () => Promise<void>;
  setAssistantTyping: (isTyping: boolean) => void;
  setPaymentFlowStopIcon: (show: boolean) => void;
  

  // Thread actions
  loadThreads: () => Promise<void>;
  addThread: (userId: string, title?: string) => Promise<string>;
  removeThread: (threadId: string) => Promise<void>;
  updateThreadTitle: (threadId: string, title: string) => Promise<void>;
  clearThreadsError: () => void;
  addPendingInsightThread: (reportId: string, reportType: string) => void;
  completePendingInsightThread: (reportId: string) => Promise<void>;
  reconcileInsightThreads: (userId: string) => Promise<void>;
  
  // Real-time sync methods
  addConversation: (conversation: Conversation) => void;
  updateConversation: (conversation: Conversation) => void;
  removeConversation: (conversationId: string) => void;
  initializeConversationSync: (userId: string) => void;
  cleanupConversationSync: () => void;
  
}

export const useChatStore = create<ChatState>()((set, get) => ({
  // Current active chat (try to restore from cache for instant UI)
  chat_id: typeof window !== 'undefined' ? localStorage.getItem('last_chat_id') : null,
  // Messages moved to useMessageStore - single source of truth
  status: 'idle',
  error: null,
  ttsVoice: 'Puck',
  isLoadingMessages: false,
  messageLoadError: null,
  lastMessagesFetch: null,
  isAssistantTyping: false,
  isPaymentFlowStopIcon: false,

  // Thread management (single source of truth)
  threads: [],
  isLoadingThreads: false,
  threadsError: null,
  pendingInsightThreads: new Map(),
  
  // Real-time sync state
  conversationChannel: null,
  isConversationSyncActive: false,

  startConversation: (id) => {
    set({ 
      chat_id: id, 
      // messages removed - use useMessageStore instead
      status: 'idle', 
      error: null,
      messageLoadError: null,
      lastMessagesFetch: null,
      isAssistantTyping: false
    });
    
    // Cache chat_id for instant UI on refresh
    if (id) {
      localStorage.setItem('last_chat_id', id);
    }
  },

  startNewConversation: async (user_id?: string) => {
    if (user_id) {
      // Auth user: create persistent conversation
      const { createConversation } = await import('@/services/conversations');
      const conversationId = await createConversation(user_id, 'New Chat');
      
      set({ 
        chat_id: conversationId,
        // messages removed - use useMessageStore instead
        status: 'idle', 
        error: null,
        messageLoadError: null,
        lastMessagesFetch: null,
        isAssistantTyping: false
      });
      
      
      return conversationId;
    } else {
      throw new Error('User authentication required to create conversations.');
    }
  },

  // loadMessages removed - use useMessageStore instead

  // addMessage, updateMessage, removeMessage removed - use useMessageStore instead

  setStatus: (status) => set({ status }),
  
  setError: (error) => set({ error, status: error ? 'error' : get().status }),

  setTtsVoice: (v) => set({ ttsVoice: v }),

  setLoadingMessages: (loading) => set({ isLoadingMessages: loading }),

  setMessageLoadError: (error) => set({ messageLoadError: error, isLoadingMessages: false }),

  retryLoadMessages: async () => {
    const state = get();
    if (!state.chat_id) return;
    
    try {
      set({ isLoadingMessages: true, messageLoadError: null });
      // Message loading moved to useMessageStore
      // Just trigger a refetch by setting chat_id
      const { setChatId } = useMessageStore.getState();
      if (state.chat_id) {
        setChatId(state.chat_id);
      }
    } catch (error) {
      console.error('[Store] Retry load messages failed:', error);
      set({ 
        messageLoadError: error instanceof Error ? error.message : 'Failed to load messages',
        isLoadingMessages: false
      });
    }
  },

  clearChat: () => {
    const state = get();
    
    // Clear message store when clearing chat
    import('@/stores/messageStore').then(({ useMessageStore }) => {
      useMessageStore.getState().clearMessages();
    });
    
    set({ 
      chat_id: null, 
      // messages removed - use useMessageStore instead
      status: 'idle', 
      error: null,
      isLoadingMessages: false,
      messageLoadError: null,
      lastMessagesFetch: null,
      isAssistantTyping: false,
      isPaymentFlowStopIcon: false
    });
    
    // Clear cached chat_id
    localStorage.removeItem('last_chat_id');
  },

  clearAllData: () => {
    // Clean up real-time sync
    get().cleanupConversationSync();
    
    // Clear all chat data
    get().clearChat();
    
    // Clear threads
    set({ 
      threads: [], 
      isLoadingThreads: false, 
      threadsError: null 
    });
  },

  setAssistantTyping: (isTyping) => set({ isAssistantTyping: isTyping }),

  setPaymentFlowStopIcon: (show) => set({ isPaymentFlowStopIcon: show }),

  // Thread actions
  loadThreads: async () => {
    set({ isLoadingThreads: true, threadsError: null });
    try {
      const { listConversations } = await import('@/services/conversations');
      const conversations = await listConversations();
      
      // Sort by updated_at desc for proper ordering
      const sortedConversations = conversations.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      
      
      set({ threads: sortedConversations, isLoadingThreads: false });
      
      // Initialize real-time sync after initial load
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        get().initializeConversationSync(user.id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load threads';
      set({ threadsError: errorMessage, isLoadingThreads: false });
    }
  },

  addThread: async (userId: string, title?: string) => {
    set({ isLoadingThreads: true, threadsError: null });
    try {
      const { createConversation } = await import('@/services/conversations');
      const conversationId = await createConversation(userId, title);
      
      // Add new thread to local state immediately for instant UI feedback
      const newThread = {
        id: conversationId,
        user_id: userId,
        title: title || 'New Chat',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        meta: null
      };
      
      set(state => ({
        threads: [newThread, ...state.threads], // Add to beginning of list
        isLoadingThreads: false
      }));
      
      return conversationId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create thread';
      set({ threadsError: errorMessage, isLoadingThreads: false });
      throw error;
    }
  },

  removeThread: async (threadId: string) => {
    set({ isLoadingThreads: true, threadsError: null });
    try {
      const { deleteConversation } = await import('@/services/conversations');
      await deleteConversation(threadId);
      
      // Update local state immediately for instant UI feedback
      set(state => ({
        threads: state.threads.filter(thread => thread.id !== threadId),
        isLoadingThreads: false
      }));
      
      // If this was the current chat, clear the session
      if (get().chat_id === threadId) {
        get().clearChat();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete thread';
      set({ threadsError: errorMessage, isLoadingThreads: false });
      throw error;
    }
  },

  updateThreadTitle: async (threadId: string, title: string) => {
    set({ isLoadingThreads: true, threadsError: null });
    try {
      const { updateConversationTitle } = await import('@/services/conversations');
      await updateConversationTitle(threadId, title);
      // Update local state
      set(state => ({
        threads: state.threads.map(thread => 
          thread.id === threadId ? { ...thread, title, updated_at: new Date().toISOString() } : thread
        ),
        isLoadingThreads: false
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update thread title';
      set({ threadsError: errorMessage, isLoadingThreads: false });
      throw error;
    }
  },

  clearThreadsError: () => set({ threadsError: null }),

  // Pending insight thread methods
  addPendingInsightThread: (reportId: string, reportType: string) => {
    // Add to pending map
    set(state => {
      const newPendingMap = new Map(state.pendingInsightThreads);
      newPendingMap.set(reportId, { reportType, timestamp: Date.now() });
      return { pendingInsightThreads: newPendingMap };
    });

    // Add optimistic UI thread with pending state
    const pendingThread: Conversation = {
      id: reportId,
      user_id: '', // Will be set when conversation is created
      title: `${reportType} - Insight (generating...)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      meta: { type: 'pending_insight', reportType, isPending: true }
    };

    set(state => ({
      threads: [pendingThread, ...state.threads]
    }));
  },

  completePendingInsightThread: async (reportId: string) => {
    const { pendingInsightThreads } = get();
    const pendingData = pendingInsightThreads.get(reportId);
    
    if (!pendingData) {
      console.warn('[Store] No pending thread found for report_id:', reportId);
      return;
    }

    try {
      // Get user from auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create the actual conversation in DB
      const { error } = await supabase
        .from('conversations')
        .insert({
          id: reportId,
          user_id: user.id,
          title: `${pendingData.reportType} - Insight`,
          meta: {
            type: 'insight_chat',
            insight_report_id: reportId,
            parent_report_type: pendingData.reportType
          }
        });

      if (error) {
        console.error('[Store] Failed to create insight conversation:', error);
        return;
      }

      // Update the thread in local state (remove pending flag)
      set(state => ({
        threads: state.threads.map(thread => 
          thread.id === reportId 
            ? {
                ...thread,
                user_id: user.id,
                title: `${pendingData.reportType} - Insight`,
                meta: {
                  type: 'insight_chat',
                  insight_report_id: reportId,
                  parent_report_type: pendingData.reportType
                }
              }
            : thread
        )
      }));

      // Remove from pending map
      const newPendingMap = new Map(pendingInsightThreads);
      newPendingMap.delete(reportId);
      set({ pendingInsightThreads: newPendingMap });

      console.log('[Store] Insight thread completed and conversation created:', reportId);
    } catch (error) {
      console.error('[Store] Error completing pending insight thread:', error);
    }
  },

  reconcileInsightThreads: async (userId: string) => {
    if (!userId) return;

    try {
      console.log('[Store] Reconciling insight threads...');

      // Get all ready insights for this user
      const { data: insights, error: insightsError } = await supabase
        .from('insights')
        .select('id, report_type, created_at')
        .eq('user_id', userId)
        .eq('is_ready', true)
        .order('created_at', { ascending: false });

      if (insightsError) {
        console.error('[Store] Failed to fetch insights for reconciliation:', insightsError);
        return;
      }

      if (!insights || insights.length === 0) {
        console.log('[Store] No insights to reconcile');
        return;
      }

      // Get all existing conversation IDs
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', userId);

      if (convError) {
        console.error('[Store] Failed to fetch conversations:', convError);
        return;
      }

      const existingConvIds = new Set(conversations?.map(c => c.id) || []);

      // Find insights that don't have conversations
      const missingConversations = insights.filter(insight => !existingConvIds.has(insight.id));

      if (missingConversations.length === 0) {
        console.log('[Store] All insights have matching conversations');
        return;
      }

      console.log(`[Store] Found ${missingConversations.length} insights without conversations, creating them...`);

      // Create missing conversations
      for (const insight of missingConversations) {
        await supabase.from('conversations').insert({
          id: insight.id,
          user_id: userId,
          title: `${insight.report_type} - Insight`,
          meta: {
            type: 'insight_chat',
            insight_report_id: insight.id,
            parent_report_type: insight.report_type
          }
        });
      }

      // Reload threads to include newly created conversations
      await get().loadThreads();

      console.log(`[Store] Reconciliation complete. Created ${missingConversations.length} missing conversations.`);
    } catch (error) {
      console.error('[Store] Error during insight reconciliation:', error);
    }
  },

  // Real-time sync methods
  addConversation: (conversation: Conversation) => {
    set(state => {
      // Check if conversation already exists to avoid duplicates
      const exists = state.threads.some(thread => thread.id === conversation.id);
      if (exists) {
        return state;
      }
      
      // Add new conversation and sort by updated_at desc
      const updatedThreads = [conversation, ...state.threads].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      
      return { threads: updatedThreads };
    });
  },

  updateConversation: (conversation: Conversation) => {
    set(state => ({
      threads: state.threads.map(thread => 
        thread.id === conversation.id ? conversation : thread
      ).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
    }));
  },

  removeConversation: (conversationId: string) => {
    set(state => ({
      threads: state.threads.filter(thread => thread.id !== conversationId)
    }));
  },

  initializeConversationSync: (userId: string) => {
    const state = get();
    
    // Don't initialize if already active
    if (state.isConversationSyncActive) {
      return;
    }

    const channel = supabase
      .channel(`conversations:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT':
              get().addConversation(payload.new as Conversation);
              break;
            case 'UPDATE':
              get().updateConversation(payload.new as Conversation);
              break;
            case 'DELETE':
              get().removeConversation(payload.old.id);
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          set({ isConversationSyncActive: true });
        }
      });

    set({ conversationChannel: channel });
  },

  cleanupConversationSync: () => {
    const state = get();
    
    if (state.conversationChannel) {
      supabase.removeChannel(state.conversationChannel);
      set({ 
        conversationChannel: null, 
        isConversationSyncActive: false 
      });
    }
  },


}));
