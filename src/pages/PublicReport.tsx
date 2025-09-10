import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import HeroSection from '@/components/public-report/HeroSection';
import FeaturesSection from '@/components/public-report/FeaturesSection';
import TestsSection from '@/components/public-report/TestsSection';
import TheraiChatGPTSection from '@/components/public-report/TheraiChatGPTSection';
import { PublicFooter } from '@/components/public-report/PublicFooter';
import { PublicLogo } from '@/components/public-report/PublicLogo';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useIsMobile } from '@/hooks/use-mobile';
// SuccessScreen removed in new flow
import { PricingProvider } from '@/contexts/PricingContext';
import UnifiedNavigation from '../components/UnifiedNavigation';
import { useScrollHeader } from '@/hooks/useScrollHeader';

const PublicReport = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [showCancelledMessage, setShowCancelledMessage] = useState(false);
  // paidGuest overlay removed in new flow
  
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
    navigate('/c');
  };



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

              <div data-hero-section>
                <HeroSection onGetReportClick={handleGetReportClick} />
              </div>
            </div>
            


            <TestsSection />
            <TheraiChatGPTSection />
            <FeaturesSection onGetReportClick={handleGetReportClick} />
            <PublicFooter />
          </div>
        </PricingProvider>
    );
  } catch (err: any) {
    return <div>Sorry, something went wrong.</div>;
  }
};

export default PublicReport;
