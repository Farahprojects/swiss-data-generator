import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '@/core/store';
import { useUserType } from '@/hooks/useUserType';
import { ChatThreadsSidebar } from '@/features/chat/ChatThreadsSidebar';
import { Conversation } from '@/services/conversations';
import { supabase } from '@/integrations/supabase/client';

interface Thread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const ChatContainer: React.FC = () => {
  const { threadId } = useParams<{ threadId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { type: userType, guestId } = useUserType();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    startConversation, 
    chat_id, 
    loadMessages,
    addThread: storeAddThread 
  } = useChatStore();

  // Fetch threads for current user
  const fetchThreads = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (userType === 'authenticated' && user) {
        // Fetch authenticated user threads
        const { data: conversations, error } = await supabase
          .from('conversations')
          .select('id, title, created_at, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        
        setThreads(conversations?.map(conv => ({
          id: conv.id,
          title: conv.title || 'New Chat',
          created_at: conv.created_at,
          updated_at: conv.updated_at
        })) || []);
      } else if (userType === 'guest' && guestId) {
        // Fetch guest threads via edge function
        const { data, error } = await supabase.functions.invoke('threads-manager', {
          body: { action: 'list_threads', guest_id: guestId }
        });

        if (error) throw error;
        setThreads(data?.threads || []);
      }
    } catch (err) {
      console.error('Error fetching threads:', err);
      setError(err instanceof Error ? err.message : 'Failed to load threads');
    } finally {
      setIsLoading(false);
    }
  };

  // Load specific thread if threadId provided
  useEffect(() => {
    if (threadId && threads.length > 0) {
      const thread = threads.find(t => t.id === threadId);
      if (thread) {
        // Verify thread belongs to current user and load it
        startConversation(threadId, userType === 'guest' ? guestId : undefined);
      } else {
        // Thread not found or doesn't belong to user, redirect to /c
        console.warn(`Thread ${threadId} not found or unauthorized access`);
        navigate('/c', { replace: true });
      }
    } else if (threadId && threads.length > 0) {
      // Thread ID provided but not found in user's threads
      console.warn(`Thread ${threadId} not found in user's threads`);
      navigate('/c', { replace: true });
    }
  }, [threadId, threads, startConversation, navigate, userType, guestId]);

  // Initialize guest ID for unauthenticated users
  const initializeGuestFlow = async () => {
    if (userType === 'unauthenticated') {
      try {
        // Create or fetch guest session via edge function
        const { data, error } = await supabase.functions.invoke('threads-manager', {
          body: { action: 'initialize_guest' }
        });
        
        if (error) throw error;
        
        // Store guest_id in session storage for persistence
        if (data?.guest_id) {
          sessionStorage.setItem('therai_guest_id', data.guest_id);
          // Trigger re-evaluation of userType
          window.dispatchEvent(new Event('guest-initialized'));
        }
      } catch (err) {
        console.error('Error initializing guest flow:', err);
        setError('Failed to initialize session');
      }
    }
  };

  // Initial load - always try to fetch data
  useEffect(() => {
    const handleDataLoad = async () => {
      if (userType === 'authenticated' || userType === 'guest') {
        await fetchThreads();
      } else if (userType === 'unauthenticated') {
        // Initialize guest flow for new unauthenticated users
        await initializeGuestFlow();
      }
      setIsLoading(false);
    };

    handleDataLoad();
  }, [userType, user?.id, guestId]);

  // Cleanup function for realtime subscriptions (if any)
  useEffect(() => {
    return () => {
      // Cleanup any realtime subscriptions here when component unmounts
      console.log('[ChatContainer] Cleaning up realtime subscriptions');
    };
  }, []);

  const handleNewChat = async () => {
    try {
      let newThreadId: string;
      
      if (userType === 'authenticated' && user) {
        newThreadId = await storeAddThread(user.id);
      } else if (userType === 'guest' && guestId) {
        // Create guest thread via edge function
        const { data, error } = await supabase.functions.invoke('threads-manager', {
          body: { action: 'create_thread', guest_id: guestId, title: 'New Chat' }
        });
        
        if (error) throw error;
        newThreadId = data.thread_id;
      } else {
        // For unauthenticated users, initialize guest flow first
        await initializeGuestFlow();
        // After initialization, the component will re-render with guest ID
        return;
      }
      
      // Refresh threads and navigate to new thread
      await fetchThreads();
      navigate(`/c/${newThreadId}`);
    } catch (err) {
      console.error('Error creating new chat:', err);
      setError(err instanceof Error ? err.message : 'Failed to create new chat');
    }
  };

  const handleThreadSelect = (threadId: string) => {
    navigate(`/c/${threadId}`);
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      if (userType === 'authenticated' && user) {
        // Delete auth user thread
        const { error } = await supabase
          .from('conversations')
          .delete()
          .eq('id', threadId)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else if (userType === 'guest' && guestId) {
        // Delete guest thread via edge function
        const { error } = await supabase.functions.invoke('threads-manager', {
          body: { action: 'delete_thread', thread_id: threadId, guest_id: guestId }
        });
        
        if (error) throw error;
      }
      
      // Refresh threads
      await fetchThreads();
      
      // If we deleted the current thread, navigate back to /c
      if (threadId === chat_id) {
        navigate('/c', { replace: true });
      }
    } catch (err) {
      console.error('Error deleting thread:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete thread');
    }
  };

  // Always render the UI, show loading state only in content area if needed
  const showLoadingInContent = isLoading && userType === 'unauthenticated';

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-background border-r border-border">
        <div className="p-4 border-b border-border">
          <button 
            onClick={handleNewChat}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            New Chat
          </button>
        </div>
        
        <div className="p-2">
          {error && (
            <div className="mb-4 p-2 bg-destructive/10 text-destructive text-sm rounded">
              {error}
            </div>
          )}
          
          <div className="space-y-1">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => handleThreadSelect(thread.id)}
                className={`w-full p-2 text-left rounded hover:bg-accent/50 transition-colors group ${
                  threadId === thread.id ? 'bg-accent text-accent-foreground' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm">{thread.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteThread(thread.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </button>
            ))}
          </div>
          
          {threads.length === 0 && !isLoading && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No chats yet. Create your first chat!
            </div>
          )}
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center">
        {showLoadingInContent ? (
          <div className="text-center">
            <div className="text-muted-foreground mb-4">Initializing session...</div>
            <div className="animate-pulse h-4 w-32 bg-muted rounded mx-auto"></div>
          </div>
        ) : threadId ? (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Chat Thread: {threadId}</h2>
            <p className="text-muted-foreground">Chat interface will be integrated here</p>
            {userType === 'unauthenticated' && (
              <div className="mt-4 p-4 bg-muted/20 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  You're browsing as a guest. Sign in to save your chats!
                </p>
                <button className="text-sm text-primary hover:underline">
                  Sign In
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Welcome to Chat</h2>
            <p className="text-muted-foreground mb-4">
              {userType === 'authenticated' 
                ? 'Select a thread or create a new chat to get started'
                : 'Create your first chat to get started'
              }
            </p>
            {userType === 'unauthenticated' && (
              <div className="mt-4 p-4 bg-muted/20 rounded-lg max-w-md">
                <p className="text-sm text-muted-foreground mb-2">
                  You can start chatting as a guest or sign in to save your conversations.
                </p>
                <div className="space-x-2">
                  <button className="text-sm text-primary hover:underline">
                    Sign In
                  </button>
                  <span className="text-muted-foreground">|</span>
                  <button 
                    onClick={handleNewChat}
                    className="text-sm text-primary hover:underline"
                  >
                    Continue as Guest
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatContainer;