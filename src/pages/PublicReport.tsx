import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import HeroSection from '@/components/public-report/HeroSection';
import FeaturesSection from '@/components/public-report/FeaturesSection';
import TestsSection from '@/components/public-report/TestsSection';
import TheraiChatGPTSection from '@/components/public-report/TheraiChatGPTSection';
import { ReportForm } from '@/components/shared/ReportForm';
import { PublicFooter } from '@/components/public-report/PublicFooter';
import { PublicLogo } from '@/components/public-report/PublicLogo';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useIsMobile } from '@/hooks/use-mobile';
import MobileReportSheet from '@/components/public-report/MobileReportSheet';
import ReportFlowChecker from '@/components/public-report/ReportFlowChecker';
// SuccessScreen removed in new flow
import { setChatTokens } from '@/services/auth/chatTokens';
import { PricingProvider } from '@/contexts/PricingContext';
import { ReportModalProvider } from '@/contexts/ReportModalContext';
import { CancelNudgeModal } from '@/components/public-report/CancelNudgeModal';
import { shouldShowCancelNudge } from '@/utils/cancelNudgeStorage';
import UnifiedNavigation from '../components/UnifiedNavigation';
import { useScrollHeader } from '@/hooks/useScrollHeader';

const PublicReport = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [showCancelledMessage, setShowCancelledMessage] = useState(false);
  const [showCancelNudge, setShowCancelNudge] = useState(false);
  const [cancelNudgeGuestId, setCancelNudgeGuestId] = useState<string>('');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [activeGuest, setActiveGuest] = useState<{ guestId: string; name: string; email: string; isStripeReturn?: boolean } | null>(null);
  const [isReportProcessing, setIsReportProcessing] = useState(false);
  const [isReportReady, setIsReportReady] = useState(false);
  // paidGuest overlay removed in new flow
  
  // Effect to detect and handle Stripe return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const guestId = params.get('guest_id');
    const paymentStatusParam = params.get('payment_status');

    if (guestId && paymentStatusParam === 'success') {
      // This is a return from a successful Stripe payment.
      // The checker will handle polling for the 'paid' status from the webhook.
      setActiveGuest({ guestId: guestId, name: '', email: '', isStripeReturn: true });

      // Clean the URL to avoid re-triggering on refresh
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('payment_status');
      window.history.replaceState({}, '', newUrl.toString());
    } else if (guestId && paymentStatusParam === 'cancelled') {
      // Handle cancelled payment - show nudge modal if appropriate
      
      if (shouldShowCancelNudge(guestId)) {
        setCancelNudgeGuestId(guestId);
        setShowCancelNudge(true);
        
        // Track the event
        console.log('[CancelNudge] cancel_nudge_shown', { guestId });
      }

      // Clean the URL to avoid re-triggering on refresh
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('payment_status');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, []); // Run only once on component mount

  const handleReportCreated = (guestId: string, _paymentStatus: 'paid' | 'pending', name: string, email: string) => {
    // Always use the checker to authoritatively verify status and handle the next step.
    setActiveGuest({ guestId, name, email, isStripeReturn: false });
  };

  const reportFormRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [showUnlockFab, setShowUnlockFab] = useState(false);
  const { isHeaderVisible, isScrolled } = useScrollHeader();

  // Check for cancelled payment status
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('status') === 'cancelled') {
      setShowCancelledMessage(true);
    }
  }, [location.search]);

  const handleGetReportClick = () => {
    // Go directly to chat page, bypassing all forms
    navigate('/chat');
  };
  
  // Observe hero visibility to toggle mobile Unlock FAB with smooth transition
  useEffect(() => {
    if (!isMobile) return;
    const target = heroRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      setShowUnlockFab(!entry.isIntersecting);
    }, { threshold: 0 });
    observer.observe(target);
    return () => {
      try { observer.disconnect(); } catch {}
    };
  }, [isMobile]);



  const handleDismissCancelMessage = () => {
    setShowCancelledMessage(false);
    // Clear the status from URL
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('status');
    window.history.replaceState({}, '', newUrl.toString());
  };
  
  try {
    return (
      <PricingProvider>
        <div className="min-h-screen bg-background">
            {/* Fixed Navigation Header */}
            <UnifiedNavigation isVisible={isHeaderVisible} isScrolled={isScrolled} />
            
            {/* Add top spacing to prevent content overlap */}
            <div className="pt-16">
              {/* Show cancelled payment message */}
              {showCancelledMessage && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-800">Payment Cancelled</p>
                          <p className="text-xs text-amber-700">Your payment was cancelled. You can try again anytime.</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleDismissCancelMessage}
                          className="text-amber-600 hover:text-amber-800 hover:bg-amber-100"
                        >
                          ×
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Cancel Nudge Modal */}
              <CancelNudgeModal
                isOpen={showCancelNudge}
                guestId={cancelNudgeGuestId}
                onClose={() => setShowCancelNudge(false)}
              />
              
              <div ref={heroRef} data-hero-section>
                <HeroSection onGetReportClick={handleGetReportClick} />
              </div>
            </div>
            


            <TestsSection />

            {/* Desktop Report Form: Hidden on small screens */}
            <div className="hidden sm:block" id="report-form" ref={reportFormRef}>
              <ReportForm onReportCreated={({ guestReportId, name, email, paymentStatus }) => {
                handleReportCreated(guestReportId, paymentStatus as ('paid' | 'pending'), name, email);
              }} />
            </div>

            <TheraiChatGPTSection />
            <FeaturesSection onGetReportClick={handleGetReportClick} />
            <PublicFooter />

            {/* Mobile Unlock FAB: Only visible on small screens */}
            <div className="block sm:hidden">
              <div
                className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
                  showUnlockFab && !isMobileDrawerOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
                }`}
                aria-hidden={!showUnlockFab || isMobileDrawerOpen}
              >
                <Button
                  onClick={handleGetReportClick}
                  className="bg-gray-900 text-white px-6 py-4 rounded-xl text-base font-normal shadow-lg hover:bg-gray-800 transition-all duration-300"
                  aria-label="Unlock report"
                >
                  Unlock
                </Button>
              </div>
            </div>

            {/* Mobile Report Sheet: Only rendered on small screens */}
            <div className="block sm:hidden">
              <MobileReportSheet
                isOpen={isMobileDrawerOpen}
                onOpenChange={setIsMobileDrawerOpen}
                onReportCreated={(guestReportId, paymentStatus, name, email) => {
                  handleReportCreated(guestReportId, paymentStatus as ('paid' | 'pending'), name, email);
                  setIsMobileDrawerOpen(false); // Close the sheet on submit
                }}
              />
            </div>
            
            {/* Loading modal for when we are verifying payment status after a Stripe redirect */}
            {activeGuest && activeGuest.isStripeReturn && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-lg p-8 flex items-center gap-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-700" />
                  <p className="text-gray-700 font-medium">Checking payment status...</p>
                </div>
              </div>
            )}

            {/* Report processing status */}
            {isReportProcessing && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating Your Report</h3>
                  <p className="text-gray-600 mb-6">This usually takes 10-14 seconds. Please wait...</p>
                  <div className="space-y-3">
                    <Button
                      disabled
                      className="w-full bg-gray-300 text-gray-500 cursor-not-allowed"
                    >
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Report ready modal */}
            {isReportReady && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Report Ready!</h3>
                  <p className="text-gray-600 mb-6">Your personalized report has been generated and is ready to explore.</p>
                  <Button
                    onClick={() => {
                      if (activeGuest) {
                        setChatTokens(activeGuest.guestId, '');
                        setActiveGuest(null);
                        setIsReportReady(false);
                        navigate(`/chat?guest_id=${activeGuest.guestId}`);
                      }
                    }}
                    className="w-full bg-gray-900 text-white hover:bg-gray-800"
                  >
                    View Report
                  </Button>
                </div>
              </div>
            )}

            {/* The checker component itself is invisible, but it's now the main orchestrator */}
            {activeGuest && (
              <ReportFlowChecker 
                guestId={activeGuest.guestId}
                name={activeGuest.name}
                email={activeGuest.email}
                onPaid={(paidData) => {
                  // Payment confirmed, navigate to chat immediately - let chat page handle report polling
                  setChatTokens(paidData.guestId, '');
                  setActiveGuest(null);
                  navigate(`/chat?guest_id=${paidData.guestId}`);
                }}
                onReportReady={(readyData) => {
                  // Report is ready, show the ready modal
                  setIsReportProcessing(false);
                  setIsReportReady(true);
                }}
                onProcessingStateChange={(isProcessing) => {
                  setIsReportProcessing(isProcessing);
                }}
              />
            )}

            {/* SuccessScreen removed: navigation handled in ReportFlowChecker.onPaid */}
          </div>
        </PricingProvider>
    );
  } catch (err: any) {
    return <div>Sorry, something went wrong.</div>;
  }
};

export default PublicReport;
