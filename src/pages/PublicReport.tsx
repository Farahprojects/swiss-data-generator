
import React, { useState, useEffect } from 'react';
import HeroSection from '@/components/public-report/HeroSection';
import FeaturesSection from '@/components/public-report/FeaturesSection';
import TestsSection from '@/components/public-report/TestsSection';
import { ReportForm } from '@/components/shared/ReportForm';
import MobileReportTrigger from '@/components/public-report/MobileReportTrigger';
import MobileReportDrawer from '@/components/public-report/MobileReportDrawer';
import Footer from '@/components/Footer';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

const PublicReport = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  // Diagnostic useEffect to catch runtime errors
  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        console.log('[DIAG] Starting diagnostics...');

        // Try a basic Supabase ping to price_list table
        const { data, error } = await supabase.from('price_list').select('*').limit(1);
        console.log('[DIAG] Supabase response:', data, error);

        if (error) throw error;
        
        console.log('[DIAG] All checks passed successfully');
      } catch (err: any) {
        console.error('[DIAG ERROR] Report page crashed with:', err?.message || err);
        console.error('[DIAG ERROR] Full error object:', err);
      }
    };

    if (typeof window !== 'undefined') {
      runDiagnostics();
    }
  }, []);

  const handleGetReportClick = () => {
    if (isMobile) {
      setIsDrawerOpen(true);
    } else {
      // For desktop, scroll to form
      const reportSection = document.querySelector('#report-form');
      if (reportSection) {
        reportSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleOpenDrawer = () => {
    setIsDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <HeroSection onGetReportClick={handleGetReportClick} />
      <TestsSection />
      {!isMobile && (
        <div id="report-form">
          <ReportForm />
        </div>
      )}
      <MobileReportTrigger 
        isDrawerOpen={isDrawerOpen}
        onOpenDrawer={handleOpenDrawer}
      />
      {/* Desktop sticky CTA removed - form is inline on desktop */}
      <MobileReportDrawer 
        isOpen={isDrawerOpen} 
        onClose={handleCloseDrawer} 
      />
      <FeaturesSection onGetReportClick={handleGetReportClick} />
      <Footer />
    </div>
  );
};

export default PublicReport;
