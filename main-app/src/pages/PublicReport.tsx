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
  const { isHeaderVisible, isScrolled } = useScrollHeader();

  const handleGetReportClick = () => {
    // Go directly to chat page, bypassing all forms
    navigate('/c');
  };



  
  try {
    return (
      <PricingProvider>
        <div className="min-h-screen bg-background">
            {/* Fixed Navigation Header */}
            <UnifiedNavigation isVisible={isHeaderVisible} isScrolled={isScrolled} />
            
            {/* Add top spacing to prevent content overlap */}
            <div className="pt-16">
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
