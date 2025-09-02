// src/screens/ReportChatScreen.tsx
import React, { useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ReportModalProvider } from '@/contexts/ReportModalContext';
import { SettingsModalProvider } from '@/contexts/SettingsModalContext';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';
import { supabase } from '@/integrations/supabase/client';

// Import ChatBox directly for immediate rendering
import { ChatBox } from '@/features/chat/ChatBox';

const ReportChatScreen = () => {
  const { chat_id } = useParams<{ chat_id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Get guest_id from URL if present
  const guestId = searchParams.get('guest_id');
  const hasTriggeredGenerationRef = useRef(false);

  // Effect to trigger report generation when guest_id is available
  useEffect(() => {
    if (!guestId || hasTriggeredGenerationRef.current) return;

    console.log(`[ChatPage] 🚀 Guest ID detected: ${guestId}, starting report generation check`);

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

  return (
    <SettingsModalProvider>
      <ReportModalProvider>
        <MobileViewportLock active>
          <div className="font-sans antialiased text-gray-800 bg-gray-50 fixed inset-0 flex flex-col">
            <ChatBox />
          </div>
        </MobileViewportLock>
      </ReportModalProvider>
    </SettingsModalProvider>
  );
};

export default ReportChatScreen;
