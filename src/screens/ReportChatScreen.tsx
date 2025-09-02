// src/screens/ReportChatScreen.tsx
import React, { useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ReportModalProvider } from '@/contexts/ReportModalContext';
import { SettingsModalProvider } from '@/contexts/SettingsModalContext';
import { PricingProvider } from '@/contexts/PricingContext';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';
import { supabase } from '@/integrations/supabase/client';

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

  // URL change listener - React will automatically re-render when URL params change
  // This is just for logging and debugging
  useEffect(() => {
    console.log(`[ChatPage] 🔗 URL parameters updated - guest_id: ${guestId}, chat_id: ${urlChatId}`);
  }, [guestId, urlChatId]);

  // Additional effect to handle guest_id and chat_id from URL search params changes
  useEffect(() => {
    // This effect will run whenever URL parameters change
    if (guestId) {
      console.log(`[ChatPage] 🔄 Guest ID from URL: ${guestId}`);
    }
    if (urlChatId) {
      console.log(`[ChatPage] 🔄 Chat ID from URL: ${urlChatId}`);
    }
    
    // If we have both IDs, log the complete session
    if (guestId && urlChatId) {
      console.log(`[ChatPage] 🎯 Complete session detected - Guest: ${guestId}, Chat: ${urlChatId}`);
    }
  }, [guestId, urlChatId]);

  return (
    <PricingProvider>
      <SettingsModalProvider>
        <ReportModalProvider>
          <MobileViewportLock active>
            <div className="font-sans antialiased text-gray-800 bg-gray-50 fixed inset-0 flex flex-col">
              <ChatBox />
            </div>
          </MobileViewportLock>
        </ReportModalProvider>
      </SettingsModalProvider>
    </PricingProvider>
  );
};

export default ReportChatScreen;
