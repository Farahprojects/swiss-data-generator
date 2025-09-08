// src/screens/ReportChatScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ReportModalProvider } from '@/contexts/ReportModalContext';
import { PricingProvider } from '@/contexts/PricingContext';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';
import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import { startReportReadyListener, stopReportReadyListener } from '@/services/report/reportReadyListener';
import { useUserConversationsStore } from '@/stores/userConversationsStore';
import { chatController } from '@/features/chat/ChatController';

// Import ChatBox directly for immediate rendering
import { ChatBox } from '@/features/chat/ChatBox';

const ReportChatScreen = () => {
  const { chat_id } = useParams<{ chat_id: string }>();
  const [searchParams] = useSearchParams();

  const { user } = useAuth();
  
  // Get guest_id, user_id, and chat_id from URL if present
  const guestId = searchParams.get('guest_id');
  const userId = searchParams.get('user_id');
  const urlChatId = searchParams.get('chat_id');
  const hasTriggeredGenerationRef = useRef(false);
  
  // Auth detection
  const isAuthenticated = !!user && !!userId;
  const isGuest = !!guestId;
  
  // 🎯 Track when guest thread is ready to show
  const [isGuestThreadReady, setIsGuestThreadReady] = useState(false);

  // 🎯 COMPLETE FLOW:
  // 1. User completes Astro form → URL updates with ?guest_id=abc123&chat_id=xyz789
  // 2. This useEffect detects the new guest_id from URL → Triggers report generation check
  // 3. If payment is confirmed → Calls trigger-report-generation
  // 4. Session persists in URL → Survives refresh, shareable, redirectable
  
  // Main report flow checker - purely URL-driven (triggers when guest_id appears in URL)
  useEffect(() => {
    if (!guestId || hasTriggeredGenerationRef.current) return;

    // 🚫 GUARD: Don't check if report is already ready in store (prevents refresh loops)
    if (useReportReadyStore.getState().isReportReady) {
      return;
    }

    console.log(`[ChatPage] 🚀 URL-driven report flow checker activated for guest_id: ${guestId}`);

    const checkAndTriggerReport = async () => {
      try {
        // First check if report is already ready
        console.log(`[ChatPage] 🔍 Checking if report already exists for: ${guestId}`);
        
        const { data: existingSignal } = await supabase
          .from('report_ready_signals')
          .select('guest_report_id')
          .eq('guest_report_id', guestId)
          .limit(1);
        
        if (existingSignal && existingSignal.length > 0) {
          console.log(`[ChatPage] ✅ Report already exists for: ${guestId}`);
          hasTriggeredGenerationRef.current = true;
          
          // Ensure chat session is initialized FIRST
          const finalChatId = urlChatId || chat_id;
          if (finalChatId) {
            console.log(`[ChatPage] 🔑 Report ready - initializing chat session: ${finalChatId}`);
            useChatStore.getState().startConversation(finalChatId, guestId);
          }
          
          // Check if context has been injected, if not trigger it
          const { data: contextCheck } = await supabase
            .from('messages')
            .select('id')
            .eq('chat_id', finalChatId)
            .eq('context_injected', true)
            .limit(1);
          
          if (!contextCheck || contextCheck.length === 0) {
            console.log(`[ChatPage] 🔄 Context not injected yet, triggering injection for: ${guestId}`);
            try {
              await supabase.functions.invoke('context-injector', {
                body: { guest_report_id: guestId }
              });
              console.log(`[ChatPage] ✅ Context injection completed for: ${guestId}`);
            } catch (error) {
              console.error(`[ChatPage] ❌ Context injection failed for ${guestId}:`, error);
            }
          } else {
            console.log(`[ChatPage] ✅ Context already injected for: ${guestId}`);
          }
          
          // Now set report ready in store and prepare the thread
          useReportReadyStore.getState().setReportReady(true);
          setIsGuestThreadReady(true);
          
          return;
        }

        // Check payment status
        console.log(`[ChatPage] 🔄 Checking payment status for: ${guestId}`);
        
        const { data, error } = await supabase.functions.invoke('get-payment-status', {
          body: { guest_id: guestId },
        });

        if (error) {
          console.error(`[ChatPage] ❌ Payment status check error for ${guestId}:`, error);
          return;
        }
        
        console.log(`[ChatPage] 📊 Payment status for ${guestId}:`, data?.payment_status);
        
        if (data?.payment_status === 'paid') {
          if (!hasTriggeredGenerationRef.current) {
            hasTriggeredGenerationRef.current = true;
            
            console.log(`[ChatPage] 💰 Payment confirmed for ${guestId}, triggering report generation`);
            
            // Trigger report generation
            const { error: triggerError } = await supabase.functions.invoke('trigger-report-generation', { 
              body: { guest_report_id: guestId } 
            });

            if (triggerError) {
              console.error(`[ChatPage] ❌ Failed to trigger report generation for ${guestId}:`, triggerError);
              return;
            }

            console.log(`[ChatPage] ✅ Report generation triggered successfully for ${guestId}`);
          }
        }
        else if (data?.payment_status === 'pending') {
          console.log(`[ChatPage] ⏳ Payment still pending for ${guestId} - user needs to complete payment`);
        }
        else {
          console.log(`[ChatPage] ℹ️ Payment status for ${guestId}: ${data?.payment_status}`);
        }
      } catch (error) {
        console.error(`[ChatPage] ❌ Unexpected error checking report status for ${guestId}:`, error);
      }
    };

    // Start the check immediately
    checkAndTriggerReport();

  }, [guestId]);

  // 🎯 WebSocket-based report ready detection (no polling)
  useEffect(() => {
    if (!guestId) return;

    // 🚫 GUARD: Don't start if report is already ready (prevents refresh loops)
    if (useReportReadyStore.getState().isReportReady) {
      return;
    }

    console.log(`[ChatPage] 🔄 Starting WebSocket report ready listener for: ${guestId}`);
    
    // Use the WebSocket-based report ready listener
    startReportReadyListener(guestId);

    // Cleanup on unmount or guestId change
    return () => {
      console.log(`[ChatPage] 🧹 Cleaning up WebSocket listener for guest_id: ${guestId}`);
      stopReportReadyListener(guestId);
    };

  }, [guestId, urlChatId, chat_id]);

  // URL change listener - React will automatically re-render when URL params change
  // This is just for logging and debugging
  useEffect(() => {
    // Reset guest thread ready state when URL parameters are cleared
    if (!guestId && isGuestThreadReady) {
      setIsGuestThreadReady(false);
      hasTriggeredGenerationRef.current = false;
    }
  }, [guestId, urlChatId, isGuestThreadReady]);

  // 🔄 STREAMLINED REHYDRATION: Simple session restoration on page load
  useEffect(() => {
    if (!guestId) return;

    // 🚫 GUARD: Don't rehydrate if report is already ready (prevents refresh loops)
    if (useReportReadyStore.getState().isReportReady) {
      return;
    }

    console.log(`[ChatPage] 🔄 Page load rehydration for guest_id: ${guestId}`);
    
    const rehydrateSession = async () => {
      try {
        // Check if we already have both IDs in store
        const store = useChatStore.getState();
        const hasCompleteSession = store.chat_id && store.guest_id;
        
        if (hasCompleteSession) {
          console.log(`[ChatPage] ✅ Session already complete in store`);
          return;
        }

        // We need to rehydrate - start with guest_id from URL
        let finalChatId = urlChatId || chat_id;
        
        // If chat_id is missing, fetch it from backend
        if (!finalChatId) {
          console.log(`[ChatPage] 🔍 Fetching chat_id from backend for guest_id: ${guestId}`);
          
          const { data: guestReport, error } = await supabase
            .from('guest_reports')
            .select('chat_id')
            .eq('id', guestId)
            .single();

          if (error || !guestReport?.chat_id) {
            console.error(`[ChatPage] ❌ Failed to fetch chat_id for guest_id: ${guestId}`, error);
            return;
          }

          finalChatId = guestReport.chat_id;
          console.log(`[ChatPage] 🔑 Retrieved chat_id: ${finalChatId} from backend`);
        }

        // Now we have both IDs - restore to store
        if (finalChatId) {
          console.log(`[ChatPage] 🔄 Restoring session to store - chat_id: ${finalChatId}, guest_id: ${guestId}`);
          store.startConversation(finalChatId, guestId);
          
          // Check if report is already ready and update thread visibility
          const { data: readySignal } = await supabase
            .from('report_ready_signals')
            .select('guest_report_id')
            .eq('guest_report_id', guestId)
            .limit(1);
            
          if (readySignal && readySignal.length > 0) {
            console.log(`[ChatPage] ✅ Report ready signal found during rehydration`);
            
            // Check if context has been injected
            const { data: contextCheck } = await supabase
              .from('messages')
              .select('id')
              .eq('chat_id', finalChatId)
              .eq('context_injected', true)
              .limit(1);
            
            if (!contextCheck || contextCheck.length === 0) {
              console.log(`[ChatPage] 🔄 Context not injected during rehydration, triggering injection for: ${guestId}`);
              try {
                await supabase.functions.invoke('context-injector', {
                  body: { guest_report_id: guestId }
                });
                console.log(`[ChatPage] ✅ Context injection completed during rehydration for: ${guestId}`);
              } catch (error) {
                console.error(`[ChatPage] ❌ Context injection failed during rehydration for ${guestId}:`, error);
              }
            }
            
            useReportReadyStore.getState().setReportReady(true);
            setIsGuestThreadReady(true);
          }
          
          // Check if context injection is needed
          if (!hasTriggeredGenerationRef.current && !useReportReadyStore.getState().isReportReady) {
            console.log(`[ChatPage] 🔄 Session restored - checking if context injection needed`);
            // This will trigger the polling logic to check for report ready signals
          } else {
            console.log(`[ChatPage] 🚫 Skipping context injection check - already handled`);
          }
        }
      } catch (error) {
        console.error(`[ChatPage] ❌ Error during session rehydration:`, error);
      }
    };

    // Run rehydration on page load
    rehydrateSession();
  }, [guestId, urlChatId, chat_id]);

  // Auth user hydration - restore conversation on page load
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const hydrateAuthUser = async () => {
      try {
        console.log(`[ChatPage] 🔄 Hydrating auth user session for user_id: ${userId}`);
        
        // Check if we already have a chat_id in store
        const store = useChatStore.getState();
        if (store.chat_id) {
          console.log(`[ChatPage] ✅ Auth user already has chat_id in store: ${store.chat_id}`);
          return;
        }

        // If URL has a chat_id, use it
        if (urlChatId || chat_id) {
          const chatIdToUse = urlChatId || chat_id;
          console.log(`[ChatPage] 🔍 Using chat_id from URL: ${chatIdToUse}`);
          
          // Verify this conversation belongs to the user
          const { data: conversation, error } = await supabase
            .from('conversations')
            .select('id, user_id')
            .eq('id', chatIdToUse)
            .eq('user_id', user.id)
            .single();

          if (error || !conversation) {
            console.error(`[ChatPage] ❌ Conversation not found or access denied: ${chatIdToUse}`, error);
            return;
          }

          // Initialize the conversation
          chatController.initializeConversation(chatIdToUse);
          console.log(`[ChatPage] ✅ Auth user conversation restored: ${chatIdToUse}`);
        } else {
          // No chat_id in URL - this is a fresh auth user session
          console.log(`[ChatPage] 🆕 Fresh auth user session - no conversation to restore`);
        }
      } catch (error) {
        console.error(`[ChatPage] ❌ Error during auth user hydration:`, error);
      }
    };

    hydrateAuthUser();
  }, [isAuthenticated, user, userId, urlChatId, chat_id]);



  return (
    <PricingProvider>
      <ReportModalProvider>
        <MobileViewportLock active>
          <div className="font-sans antialiased text-gray-800 bg-gray-50 fixed inset-0 flex flex-col">
            <ChatBox isGuestThreadReady={isGuestThreadReady} />
          </div>
        </MobileViewportLock>
      </ReportModalProvider>
    </PricingProvider>
  );
};

export default ReportChatScreen;
