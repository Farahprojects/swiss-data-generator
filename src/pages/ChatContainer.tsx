import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { ChatBox } from '@/features/chat/ChatBox';
import { PricingProvider } from '@/contexts/PricingContext';
import { ReportModalProvider } from '@/contexts/ReportModalContext';
import { MobileViewportLock } from '@/features/chat/MobileViewportLock';
import { useChatInitialization } from '@/hooks/useChatInitialization';
import { CancelNudgeModal } from '@/components/public-report/CancelNudgeModal';
import { PaymentProcessingUI } from '@/components/chat/PaymentProcessingUI';
import { supabase } from '@/integrations/supabase/client';

/**
 * Streamlined ChatContainer - Single Responsibility
 * 
 * Architecture:
 * - URL threadId → useChatInitialization → ChatController → Store → Components
 * - No complex logic, just one moving part
 * - ChatThreadsSidebar handles its own thread management
 * - ChatController handles all chat logic
 */
const ChatContainer: React.FC = () => {
  // State for handling Stripe payment cancellation
  const [searchParams] = useSearchParams();
  const { threadId } = useParams<{ threadId: string }>();
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Payment gate state
  const [paymentStatus, setPaymentStatus] = useState<'checking' | 'pending' | 'paid' | 'error'>('checking');
  const [isPaymentGateActive, setIsPaymentGateActive] = useState(false);

  // Single responsibility: Initialize chat when threadId changes
  // Only initialize if payment gate allows it
  useChatInitialization({ skipIfPaymentPending: isPaymentGateActive });

  // Detect payment cancellation from URL parameters
  useEffect(() => {
    const urlPaymentStatus = searchParams.get('payment_status');
    if (urlPaymentStatus === 'cancelled' && threadId) {
      console.log(`[ChatContainer] Payment cancelled detected for threadId: ${threadId}`);
      setShowCancelModal(true);
    }
  }, [searchParams, threadId]);

  // Payment gate: Check payment status for guest users only
  useEffect(() => {
    if (!threadId) return;

    // Only apply payment gate to guest routes (/c/g/{threadId})
    const isGuestRoute = window.location.pathname.startsWith('/c/g/');
    if (!isGuestRoute) {
      console.log(`[ChatContainer] Not a guest route, skipping payment gate`);
      setIsPaymentGateActive(false);
      return;
    }

    const checkPaymentStatus = async () => {
      try {
        console.log(`[ChatContainer] Checking payment status for guest threadId: ${threadId}`);
        
        const { data: guestReport, error } = await supabase
          .from('guest_reports')
          .select('payment_status, report_generated')
          .eq('id', threadId)
          .single();

        if (error) {
          console.error(`[ChatContainer] Error fetching payment status:`, error);
          setPaymentStatus('error');
          setIsPaymentGateActive(false);
          return;
        }

        console.log(`[ChatContainer] Payment status: ${guestReport.payment_status}, Report generated: ${guestReport.report_generated}`);

        if (guestReport.payment_status === 'paid') {
          setPaymentStatus('paid');
          setIsPaymentGateActive(false);
        } else {
          setPaymentStatus('pending');
          setIsPaymentGateActive(true);
          // Start polling for payment status changes
          startPaymentPolling();
        }
      } catch (error) {
        console.error(`[ChatContainer] Error in payment status check:`, error);
        setPaymentStatus('error');
        setIsPaymentGateActive(false);
      }
    };

    checkPaymentStatus();
  }, [threadId]);

  // Payment polling logic
  const startPaymentPolling = () => {
    if (!threadId) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data: guestReport, error } = await supabase
          .from('guest_reports')
          .select('payment_status, report_generated')
          .eq('id', threadId)
          .single();

        if (error) {
          console.error(`[ChatContainer] Polling error:`, error);
          return;
        }

        console.log(`[ChatContainer] Polling - Payment status: ${guestReport.payment_status}`);

        if (guestReport.payment_status === 'paid') {
          console.log(`[ChatContainer] Payment confirmed! Switching to chat UI`);
          setPaymentStatus('paid');
          setIsPaymentGateActive(false);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error(`[ChatContainer] Polling error:`, error);
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 300000);
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    // Clean up URL parameters
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('payment_status');
    const newUrl = `${window.location.pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  };

  return (
    <div className="flex h-screen">
      <PricingProvider>
        <ReportModalProvider>
          <MobileViewportLock active>
            {/* Payment Gate: Show processing UI or chat based on payment status */}
            {isPaymentGateActive ? (
              <PaymentProcessingUI guestId={threadId || ''} />
            ) : (
              <ChatBox />
            )}
          </MobileViewportLock>
        </ReportModalProvider>
      </PricingProvider>
      
      {/* Stripe Payment Cancellation Modal */}
      {showCancelModal && threadId && (
        <CancelNudgeModal
          isOpen={showCancelModal}
          guestId={threadId}
          onClose={handleCloseCancelModal}
        />
      )}
    </div>
  );
};

export default ChatContainer;