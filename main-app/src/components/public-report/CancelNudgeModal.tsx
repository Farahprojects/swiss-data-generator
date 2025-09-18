import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface CancelNudgeModalProps {
  isOpen: boolean;
  guestId: string;
  onClose: () => void;
}

export const CancelNudgeModal = ({ isOpen, guestId, onClose }: CancelNudgeModalProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Focus trap and ESC handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      // Simple focus trap - keep focus within modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, input, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Focus first element when modal opens
    setTimeout(() => firstFocusableRef.current?.focus(), 100);
    
    // Prevent background scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const trackEvent = (eventName: string, additionalData?: Record<string, any>) => {
    console.log(`[CancelNudge] ${eventName}`, { guestId, ...additionalData });
    // Simple tracking - could be extended with analytics service
  };

  const handleClose = async () => {
    trackEvent('cancel_nudge_dismissed');
    
    // Store timestamp in localStorage to prevent re-showing for 7 days
    const timestamp = Date.now();
    localStorage.setItem(`cancel_nudge:${guestId}`, timestamp.toString());
    
    // Clean up all temporary session state and redirect to start
    try {
      const { streamlinedSessionReset } = await import('@/utils/streamlinedSessionReset');
      await streamlinedSessionReset({ 
        redirectTo: '/', 
        cleanDatabase: true 
      });
    } catch (error) {
      console.error('[CancelNudgeModal] Error during session cleanup:', error);
      // Fallback: just close modal and redirect
      window.location.replace('/');
    }
  };

  const handleResumeCheckout = async () => {
    trackEvent('cancel_nudge_resume_clicked');
    setIsProcessing(true);

    try {
      // First try to get existing checkout URL
      const { data: existingData, error: existingError } = await supabase.functions.invoke('get-checkout-url', {
        body: { guest_id: guestId },
      });

      if (existingData?.checkoutUrl) {
        // Use existing checkout URL
        const timestamp = Date.now();
        localStorage.setItem(`cancel_nudge:${guestId}`, timestamp.toString());
        window.location.href = existingData.checkoutUrl;
        return;
      }

      // If no existing URL, create a new one via resume-stripe-checkout
      const { data, error } = await supabase.functions.invoke('resume-stripe-checkout', {
        body: { 
          guest_id: guestId,
          chat_id: window.location.pathname.split('/').pop() // Extract chat_id from URL
        },
      });

      if (error || !data?.checkoutUrl) {
        console.error('Failed to create checkout URL:', error);
        alert('Unable to resume checkout. Please try again.');
        return;
      }

      // Store timestamp before redirect
      const timestamp = Date.now();
      localStorage.setItem(`cancel_nudge:${guestId}`, timestamp.toString());
      
      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error('Error resuming checkout:', err);
      alert('Unable to resume checkout. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-nudge-title"
      >
        {/* Close button */}
        <button
          ref={firstFocusableRef}
          onClick={handleClose}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-10">
          {/* Title */}
          <h2 
            id="cancel-nudge-title"
            className="text-2xl font-light text-gray-900 mb-6 tracking-tight pr-8"
          >
            Looks like you didn't finish checking out.
          </h2>

          {/* Body */}
          <p className="text-gray-600 mb-10 leading-relaxed">
            We put a lot of care into building this app to make self-discovery simple and enjoyable. Why not give it a try?
          </p>

          {/* Actions */}
          <div className="space-y-4">
            {/* Primary CTA */}
            <Button
              onClick={handleResumeCheckout}
              disabled={isProcessing}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-normal py-3 px-6 rounded-xl transition-colors"
            >
              {isProcessing ? (
                "Creating session..."
              ) : (
                <>
                  Resume checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
