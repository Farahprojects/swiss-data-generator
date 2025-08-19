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
import { setSessionIds } from '@/services/auth/sessionIds';
import { PricingProvider } from '@/contexts/PricingContext';
import { ReportModalProvider } from '@/contexts/ReportModalContext';
import { CancelNudgeModal } from '@/components/public-report/CancelNudgeModal';
import { shouldShowCancelNudge } from '@/utils/cancelNudgeStorage';
import { scrollLockDebugger } from '@/utils/scrollLockDebugger';

const PublicReport = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [showCancelledMessage, setShowCancelledMessage] = useState(false);
  const [showCancelNudge, setShowCancelNudge] = useState(false);
  const [cancelNudgeGuestId, setCancelNudgeGuestId] = useState<string>('');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [activeGuest, setActiveGuest] = useState<{ guestId: string; name: string; email: string; chatId?: string; isStripeReturn?: boolean } | null>(null);
  const [isReportProcessing, setIsReportProcessing] = useState(false);
  const [isReportReady, setIsReportReady] = useState(false);
  // paidGuest overlay removed in new flow
  
  // Cleanup scroll locks on unmount or when issues are detected
  useEffect(() => {
    // Check for stuck scroll locks periodically
    const checkScrollLocks = () => {
      if (scrollLockDebugger.isScrollLocked()) {
        const state = scrollLockDebugger.getState();
        if (state.lockSources.length === 0) {
          console.warn('[PublicReport] Detected stuck scroll lock with no registered sources, forcing reset');
          scrollLockDebugger.forceReset();
        }
      }
    };

    // Check immediately and then every 5 seconds
    checkScrollLocks();
    const interval = setInterval(checkScrollLocks, 5000);

    return () => {
      clearInterval(interval);
      // Force reset on unmount to ensure clean state
      if (scrollLockDebugger.isScrollLocked()) {
        console.log('[PublicReport] Component unmounting, resetting any remaining scroll locks');
        scrollLockDebugger.forceReset();
      }
    };
  }, []);

  // Effect to detect and handle Stripe return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const guestId = params.get('guest_id');
    const paymentStatusParam = params.get('payment_status');

    if (guestId && paymentStatusParam === 'success') {
      // This is a return from a successful Stripe payment.
      console.log(`[PublicReport] Stripe return detected for guestId: ${guestId}. Starting checker.`);
      // The checker will handle polling for the 'paid' status from the webhook.
      setActiveGuest({ guestId: guestId, name: '', email: '', isStripeReturn: true });

      // Clean the URL to avoid re-triggering on refresh
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('payment_status');
      window.history.replaceState({}, '', newUrl.toString());
    } else if (guestId && paymentStatusParam === 'cancelled') {
      // Handle cancelled payment - show nudge modal if appropriate
      console.log(`[PublicReport] Cancelled payment detected for guestId: ${guestId}`);
      
      if (shouldShowCancelNudge(guestId)) {
        console.log('[PublicReport] Showing cancel nudge modal');
        setCancelNudgeGuestId(guestId);
        setShowCancelNudge(true);
        
        // Track the event
        console.log('[CancelNudge] cancel_nudge_shown', { guestId });
      } else {
        console.log('[PublicReport] Cancel nudge already shown recently, skipping');
      }

      // Clean the URL to avoid re-triggering on refresh
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('payment_status');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, []); // Run only once on component mount

  const handleReportCreated = (guestId: string, _paymentStatus: 'paid' | 'pending', name: string, email: string, chatId?: string) => {
    // Always use the checker to authoritatively verify status and handle the next step.
    setActiveGuest({ guestId, name, email, chatId, isStripeReturn: false });
  };

  const reportFormRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [showUnlockFab, setShowUnlockFab] = useState(false);
  const [showHeader, setShowHeader] = useState(true);

  // Check for cancelled payment status
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('status') === 'cancelled') {
      setShowCancelledMessage(true);
    }
  }, [location.search]);

  const handleGetReportClick = () => {
    if (isMobile) {
      setIsMobileDrawerOpen(true);
    } else {
      const reportSection = document.querySelector('#report-form');
      if (reportSection && reportSection instanceof HTMLElement) {
        reportSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
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

  // Observe hero visibility to fade header in/out
  useEffect(() => {
    const target = heroRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      setShowHeader(entry.isIntersecting);
    }, { threshold: 0.1 });
    observer.observe(target);
    return () => {
      try { observer.disconnect(); } catch {}
    };
  }, []);

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
            {/* Show cancelled payment message */}
            {showCancelledMessage && (
              <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
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

            {/* Animated header with logo */}
            <header className={`absolute top-0 left-0 z-40 p-6 transition-opacity duration-500 ease-out ${
              showHeader ? 'opacity-100' : 'opacity-0'
            }`}>
              <div>
                <PublicLogo size="md" asLink={false} />
              </div>
            </header>
            
            <div ref={heroRef}>
              <HeroSection onGetReportClick={handleGetReportClick} />
            </div>
            
            {/* Sample Report Section */}
            <section className="py-24 bg-gradient-to-b from-white to-gray-50/30">
              <div className="w-full md:px-4 md:container md:mx-auto">
                <div className="max-w-6xl mx-auto">
                  <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 tracking-tight">
                      See What You'll Get
                    </h2>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
                      Real psychological profiles with actionable insights - see the depth and precision you'll receive.
                    </p>
                  </div>

                  {/* Sync Pro Compatibility Preview */}
                  <div className="mb-24">
                    <div className="flex flex-col md:grid md:grid-cols-2 gap-0 md:gap-12 mb-16">
                      {/* Peter's Profile */}
                      <div className="bg-white/80 backdrop-blur-sm rounded-none md:rounded-2xl p-0 md:p-8 border-0 md:border border-gray-200/50 hover:border-gray-300/60 transition-all duration-500 hover:translate-y-[-2px] group mb-4 md:mb-0">
                        <div className="p-3 md:p-0">
                          <div className="text-center mb-8">
                            <h3 className="text-2xl font-light text-gray-900 mb-2 tracking-tight">Peter Farah</h3>
                            <p className="text-gray-600 font-normal">Creative Visionary • Structured Strategist</p>
                          </div>
                          
                          <div className="space-y-6">
                          <div className="transform group-hover:translate-x-1 transition-transform duration-300">
                            <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Communication Style</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">Expressive and conceptual, prefers big-picture discussions with room for structured planning.</p>
                          </div>
                          
                          <div className="transform group-hover:translate-x-1 transition-transform duration-500">
                            <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Decision Making</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">Balances intuitive insights with methodical analysis, values both innovation and process.</p>
                          </div>
                          
                          <div className="transform group-hover:translate-x-1 transition-transform duration-700">
                            <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Relationship Needs</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">Thrives with partners who appreciate both creative freedom and collaborative planning.</p>
                          </div>
                          </div>
                        </div>
                      </div>

                      {/* Olivia's Profile */}
                      <div className="bg-white/80 backdrop-blur-sm rounded-none md:rounded-2xl p-0 md:p-8 border-0 md:border border-gray-200/50 hover:border-gray-300/60 transition-all duration-500 hover:translate-y-[-2px] group">
                        <div className="p-3 md:p-0">
                          <div className="text-center mb-8">
                            <h3 className="text-2xl font-light text-gray-900 mb-2 tracking-tight">Olivia Patten</h3>
                            <p className="text-gray-600 font-normal">Intuitive Connector • Detail Orchestrator</p>
                          </div>
                          
                          <div className="space-y-6">
                          <div className="transform group-hover:translate-x-1 transition-transform duration-300">
                            <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Communication Style</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">Empathetic and thorough, excels at reading between the lines and organizing details.</p>
                          </div>
                          
                          <div className="transform group-hover:translate-x-1 transition-transform duration-500">
                            <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Decision Making</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">Combines emotional intelligence with systematic execution, values harmony and efficiency.</p>
                          </div>
                          
                          <div className="transform group-hover:translate-x-1 transition-transform duration-700">
                            <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Relationship Needs</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">Values partners who bring vision while appreciating her attention to emotional nuances.</p>
                          </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Their Sync Dynamic */}
                    <div className="relative overflow-hidden bg-white/60 backdrop-blur-sm rounded-none md:rounded-2xl p-4 md:p-12 border-0 md:border border-gray-200/50">
                      {/* Subtle background elements */}
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-6 left-12 w-1 h-1 bg-gray-400 rounded-full animate-pulse"></div>
                        <div className="absolute top-12 right-16 w-0.5 h-0.5 bg-gray-500 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                        <div className="absolute bottom-8 left-1/4 w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
                        <div className="absolute bottom-12 right-1/3 w-0.5 h-0.5 bg-gray-500 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
                      </div>

                      <h3 className="text-3xl md:text-4xl font-light text-gray-900 mb-12 text-center relative z-10 tracking-tight">
                        Their Sync Dynamic
                        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-16 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent"></div>
                      </h3>
                      
                      <div className="grid md:grid-cols-3 gap-12 relative z-10">
                        <div className="text-center group">
                          <div className="w-24 h-24 bg-gray-50 border border-gray-200/50 rounded-full flex items-center justify-center mx-auto mb-6 hover:scale-105 transition-all duration-500 hover:border-gray-300/60">
                            <span className="text-3xl font-light text-gray-700 group-hover:scale-110 transition-transform duration-300">92%</span>
                          </div>
                          <h4 className="font-medium text-gray-900 mb-3 text-sm tracking-wide uppercase group-hover:text-gray-700 transition-colors duration-300">Vision Alignment</h4>
                          <p className="text-gray-600 text-sm leading-relaxed">Both value growth and structured progress toward shared goals.</p>
                        </div>
                        
                        <div className="text-center group">
                          <div className="w-24 h-24 bg-gray-50 border border-gray-200/50 rounded-full flex items-center justify-center mx-auto mb-6 hover:scale-105 transition-all duration-500 hover:border-gray-300/60" style={{animationDelay: '0.2s'}}>
                            <span className="text-3xl font-light text-gray-700 group-hover:scale-110 transition-transform duration-300">88%</span>
                          </div>
                          <h4 className="font-medium text-gray-900 mb-3 text-sm tracking-wide uppercase group-hover:text-gray-700 transition-colors duration-300">Communication Flow</h4>
                          <p className="text-gray-600 text-sm leading-relaxed">Peter's big picture thinking complements Olivia's detail orientation perfectly.</p>
                        </div>
                        
                        <div className="text-center group">
                          <div className="w-24 h-24 bg-gray-50 border border-gray-200/50 rounded-full flex items-center justify-center mx-auto mb-6 hover:scale-105 transition-all duration-500 hover:border-gray-300/60" style={{animationDelay: '0.4s'}}>
                            <span className="text-3xl font-light text-gray-700 group-hover:scale-110 transition-transform duration-300">95%</span>
                          </div>
                          <h4 className="font-medium text-gray-900 mb-3 text-sm tracking-wide uppercase group-hover:text-gray-700 transition-colors duration-300">Growth Potential</h4>
                          <p className="text-gray-600 text-sm leading-relaxed">Their different strengths create a powerful dynamic for mutual development.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Examples Grid */}
                  <div className="flex flex-col md:grid md:grid-cols-2 gap-0 md:gap-12 mb-16">
                    {/* Cognitive Processing Profile Card */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-none md:rounded-2xl p-0 md:p-8 border-0 md:border border-gray-200/50 hover:border-gray-300/60 transition-all duration-500 hover:translate-y-[-2px] group mb-4 md:mb-0">
                      <div className="p-3 md:p-0">
                        <div className="text-center mb-8">
                          <h3 className="text-2xl font-light text-gray-900 mb-2 tracking-tight">Cognitive Processing Profile</h3>
                          <p className="text-gray-600 font-normal">Personal Essence Report • Generated in 2 minutes</p>
                        </div>
                        
                        <div className="space-y-6">
                        <div className="transform group-hover:translate-x-1 transition-transform duration-300">
                          <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Primary Style</h4>
                          <p className="text-gray-600 text-sm leading-relaxed">Creative Visionary (Big-Picture) - Naturally gravitates towards seeing the grand scheme and weaving ideas into cohesive visions.</p>
                        </div>
                        
                        <div className="transform group-hover:translate-x-1 transition-transform duration-500">
                          <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Secondary Style</h4>
                          <p className="text-gray-600 text-sm leading-relaxed">Structured Strategist (Process) - Brings methodical execution to innovative ideas.</p>
                        </div>
                        
                        <div className="transform group-hover:translate-x-1 transition-transform duration-700">
                          <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Key Insight</h4>
                          <p className="text-gray-600 text-sm leading-relaxed">A harmonious blend of creativity and structure that enables navigating challenges with agility while bringing visionary ideas to fruition.</p>
                        </div>
                        </div>
                      </div>
                    </div>

                    {/* Astro Data Card */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-none md:rounded-2xl p-0 md:p-8 border-0 md:border border-gray-200/50 hover:border-gray-300/60 transition-all duration-500 hover:translate-y-[-2px] group">
                      <div className="p-3 md:p-0">
                        <div className="text-center mb-8">
                          <h3 className="text-2xl font-light text-gray-900 mb-2 tracking-tight">Raw Astro Data</h3>
                          <p className="text-gray-600 font-normal">Precise astronomical calculations • Powered by Therai Swiss</p>
                        </div>
                        
                        <div className="space-y-6">
                        <div className="transform group-hover:translate-x-1 transition-transform duration-300">
                          <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">What This Shows</h4>
                          <p className="text-gray-600 text-sm leading-relaxed">The exact astronomical positions at your birth moment - the foundation for all astrological interpretation.</p>
                        </div>
                        
                        <div className="transform group-hover:translate-x-1 transition-transform duration-500">
                          <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Sample Data</h4>
                          <p className="text-gray-600 text-sm leading-relaxed">Sun: Gemini 15°42' • Moon: Scorpio 28°13' • Rising: Virgo 3°51'</p>
                        </div>
                        
                        <div className="transform group-hover:translate-x-1 transition-transform duration-700">
                          <h4 className="font-medium text-gray-900 mb-2 text-sm tracking-wide uppercase">Why It Matters</h4>
                          <p className="text-gray-600 text-sm leading-relaxed">These precise coordinates create your unique cosmic blueprint - no two people born at different times have identical data.</p>
                        </div>
                        </div>

                        <div className="mt-6 p-4 bg-gray-50/60 rounded-xl border border-gray-200/30">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium text-gray-700 tracking-wide uppercase">Therai Swiss</span>
                          </div>
                          <p className="text-xs text-gray-600 text-center leading-relaxed">
                            Swiss-precision astronomical calculations in seconds
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center mt-16">
                    <button 
                      onClick={handleGetReportClick}
                      className="bg-gray-900 text-white px-12 py-4 rounded-xl text-lg font-normal hover:bg-gray-800 transition-all duration-300 hover:scale-105 border border-gray-800/20 shadow-lg hover:shadow-xl"
                    >
                      Unlock
                    </button>
                    <p className="text-gray-500 mt-4 font-light">Takes 2 minutes • Instant results</p>
                  </div>
                </div>
              </div>
            </section>

            <TestsSection />
            {!isMobile && (
              <div id="report-form" ref={reportFormRef}>
                <ReportForm onReportCreated={({ guestReportId, name, email, paymentStatus }) => {
                  handleReportCreated(guestReportId, paymentStatus as ('paid' | 'pending'), name, email);
                }} />
              </div>
            )}
            <TheraiChatGPTSection />
            <FeaturesSection onGetReportClick={handleGetReportClick} />
            <PublicFooter />

            {isMobile && (
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
            )}

            {/* Mobile: use top-level portal sheet for stable keyboard handling */}
            <MobileReportSheet
              isOpen={isMobileDrawerOpen}
              onOpenChange={setIsMobileDrawerOpen}
              onReportCreated={(guestReportId, paymentStatus, name, email) => {
                handleReportCreated(guestReportId, paymentStatus as ('paid' | 'pending'), name, email);
                setIsMobileDrawerOpen(false); // Close the sheet on submit
              }}
            />
            
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
                        console.log('[PublicReport] Setting chat tokens with guest ID:', activeGuest.guestId);
                        if (!activeGuest.chatId) {
                          console.error('[PublicReport] Missing chatId for guest:', activeGuest.guestId);
                          return;
                        }
                        setSessionIds(activeGuest.guestId, activeGuest.chatId);
                        console.log('[PublicReport] Chat tokens set, navigating to chat');
                        setActiveGuest(null);
                        setIsReportReady(false);
                        navigate('/chat');
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
                  console.log('[PublicReport] Payment confirmed, navigating to chat:', paidData.guestId);
                  if (!activeGuest?.chatId) {
                    console.error('[PublicReport] Missing chatId for paid guest:', paidData.guestId);
                    return;
                  }
                  setSessionIds(paidData.guestId, activeGuest.chatId);
                  setActiveGuest(null);
                  navigate('/chat');
                }}
                onReportReady={(readyData) => {
                  // Report is ready, show the ready modal
                  console.log('[PublicReport] Report ready:', readyData.guestId);
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
