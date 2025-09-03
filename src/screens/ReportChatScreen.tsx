// src/screens/ReportChatScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ReportModalProvider } from '@/contexts/ReportModalContext';
import { SettingsModalProvider } from '@/contexts/SettingsModalContext';
import { PricingProvider } from '@/contexts/PricingContext';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';
import { supabase } from '@/integrations/supabase/client';
import { useChatStore } from '@/core/store';
import { useReportReadyStore } from '@/services/report/reportReadyStore';

// Import ChatBox directly for immediate rendering
import { ChatBox } from '@/features/chat/ChatBox';

const ReportChatScreen = () => {
  const { chat_id } = useParams<{ chat_id: string }>();
  const [searchParams] = useSearchParams();

  const { user } = useAuth();
  
  // Get guest_id and chat_id from URL if present
  const guestId = searchParams.get('guest_id');
  const urlChatId = searchParams.get('chat_id');
  const hasTriggeredGenerationRef = useRef(false);
  
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
          
          // Set report ready in store and prepare the thread
          useReportReadyStore.getState().setReportReady(true);
          setIsGuestThreadReady(true);
          
          // Ensure chat session is initialized
          const finalChatId = urlChatId || chat_id;
          if (finalChatId) {
            console.log(`[ChatPage] 🔑 Report ready - initializing chat session: ${finalChatId}`);
            useChatStore.getState().startConversation(finalChatId, guestId);
          }
          
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

  // 🎯 POLLING: Check for report ready signals every 2 seconds
  useEffect(() => {
    if (!guestId) return;

    console.log(`[ChatPage] 🔄 Starting report ready polling for guest_id: ${guestId}`);
    
    const pollInterval = setInterval(async () => {
      try {
        // Reduced logging - only log on first attempt and errors
        
        const { data: signals, error } = await supabase
          .from('report_ready_signals')
          .select('guest_report_id, created_at')
          .eq('guest_report_id', guestId)
          .limit(1);

        if (error) {
          console.error(`[ChatPage] ❌ Polling error:`, error);
          return;
        }

        if (signals && signals.length > 0) {
          console.log(`[ChatPage] 🎉 Report ready signal detected for: ${guestId}!`);
          clearInterval(pollInterval);
          
          // Trigger context injection
          console.log(`[ChatPage] 💉 Calling context-injector for: ${guestId}`);
          const { data: contextData, error: contextError } = await supabase.functions.invoke('context-injector', {
            body: { guest_report_id: guestId }
          });

          if (contextError) {
            console.error(`[ChatPage] ❌ Context injection failed:`, contextError);
            return;
          }

          console.log(`[ChatPage] ✅ Context injection successful:`, contextData);
          hasTriggeredGenerationRef.current = true;
          
          // Set report ready state in store for persistence
          useReportReadyStore.getState().setReportReady(true);
          console.log(`[ChatPage] 📊 Report ready state set in store`);
          
          // Show success message to user
          console.log(`[ChatPage] 🎯 Astro data successfully injected into chat!`);
          
          // 🎯 Set chat ID in store for conversation mode
          const finalChatId = urlChatId || chat_id;
          if (finalChatId) {
            console.log(`[ChatPage] 🔑 Setting chat_id and guest_id in store: ${finalChatId}, ${guestId}`);
            // Start conversation in store with both chat_id and guest_id
            useChatStore.getState().startConversation(finalChatId, guestId);
          }
          
          // 🎯 Show guest thread on left panel - system is ready!
          console.log(`[ChatPage] 🧵 Guest thread ready - showing on left panel`);
          setIsGuestThreadReady(true);
        }
      } catch (error) {
        console.error(`[ChatPage] ❌ Polling error:`, error);
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup on unmount or guestId change
    return () => {
      console.log(`[ChatPage] 🧹 Cleaning up polling for guest_id: ${guestId}`);
      clearInterval(pollInterval);
    };

  }, [guestId]);

  // URL change listener - React will automatically re-render when URL params change
  useEffect(() => {
    // Reset guest thread ready state when URL parameters are cleared
    if (!guestId && isGuestThreadReady) {
      console.log(`[ChatPage] 🔄 Guest ID cleared, resetting thread ready state`);
      setIsGuestThreadReady(false);
      hasTriggeredGenerationRef.current = false;
    }
  }, [guestId, urlChatId, isGuestThreadReady]);

  // 🔄 STREAMLINED REHYDRATION: Simple session restoration on page load
  useEffect(() => {
    if (!guestId) return;

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
          
          // Only start conversation if not already active
          if (store.chat_id !== finalChatId) {
            store.startConversation(finalChatId, guestId);
          }
          
          // Check if report is already ready and update thread visibility
          const { data: readySignal } = await supabase
            .from('report_ready_signals')
            .select('guest_report_id')
            .eq('guest_report_id', guestId)
            .limit(1);
            
          if (readySignal && readySignal.length > 0) {
            console.log(`[ChatPage] ✅ Report ready signal found during rehydration`);
            useReportReadyStore.getState().setReportReady(true);
            setIsGuestThreadReady(true);
          }
          
          // Check if context injection is needed
          if (!hasTriggeredGenerationRef.current) {
            console.log(`[ChatPage] 🔄 Session restored - checking if context injection needed`);
            // This will trigger the polling logic to check for report ready signals
          }
        }
      } catch (error) {
        console.error(`[ChatPage] ❌ Error during session rehydration:`, error);
      }
    };

    // Run rehydration on page load
    rehydrateSession();
  }, [guestId, urlChatId, chat_id]);



  return (
    <PricingProvider>
      <SettingsModalProvider>
        <ReportModalProvider>
          <MobileViewportLock active>
            <div className="font-sans antialiased text-gray-800 bg-gray-50 fixed inset-0 flex flex-col">
              <ChatBox isGuestThreadReady={isGuestThreadReady} guestReportId={guestId} />
            </div>
          </MobileViewportLock>
        </ReportModalProvider>
      </SettingsModalProvider>
    </PricingProvider>
  );
};

export default ReportChatScreen;
