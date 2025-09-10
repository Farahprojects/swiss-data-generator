import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChatStore } from '@/core/store';
import { useUserType } from '@/hooks/useUserType';
import { ChatThreadsSidebar } from '@/features/chat/ChatThreadsSidebar';
import { ChatBox } from '@/features/chat/ChatBox';
import { PricingProvider } from '@/contexts/PricingContext';
import { ReportModalProvider } from '@/contexts/ReportModalContext';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';
import { supabase } from '@/integrations/supabase/client';
import { verifyGuestPayment } from '@/utils/guest-checkout';

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
        // Step 1: Verify payment status before creating thread
        console.log(`[ChatContainer] Verifying payment for guest ${guestId} before thread creation`);
        
        const paymentVerification = await verifyGuestPayment(guestId);
        
        if (!paymentVerification.success || !paymentVerification.verified) {
          console.error(`[ChatContainer] Payment verification failed for guest ${guestId}:`, paymentVerification.error);
          throw new Error(paymentVerification.error || 'Payment verification failed. Please complete payment before creating a chat thread.');
        }
        
        console.log(`[ChatContainer] Payment verified for guest ${guestId}, proceeding with thread creation`);
        
        // Step 2: Create guest thread via edge function (now with payment validation)
        const { data, error } = await supabase.functions.invoke('threads-manager', {
          body: { action: 'create_thread', guest_id: guestId, title: 'New Chat' }
        });
        
        if (error) {
          // Handle specific payment-related errors from threads-manager
          if (error.message?.includes('Payment not completed')) {
            throw new Error('Payment not completed. Please complete payment before creating a chat thread.');
          }
          throw error;
        }
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
      {showLoadingInContent ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      ) : (
        <PricingProvider>
          <ReportModalProvider>
            <MobileViewportLock active>
              <ChatBox />
            </MobileViewportLock>
          </ReportModalProvider>
        </PricingProvider>
      )}
    </div>
  );
};

export default ChatContainer;