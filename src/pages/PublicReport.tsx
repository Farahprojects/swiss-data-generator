
import React, { useState } from 'react';
import HeroSection from '@/components/public-report/HeroSection';
import FeaturesSection from '@/components/public-report/FeaturesSection';
import TestsSection from '@/components/public-report/TestsSection';
import { ReportForm } from '@/components/shared/ReportForm';
import MobileReportTrigger from '@/components/public-report/MobileReportTrigger';
import DesktopStickyTrigger from '@/components/public-report/DesktopStickyTrigger';
import MobileReportDrawer from '@/components/public-report/MobileReportDrawer';
import { useIsMobile } from '@/hooks/use-mobile';

const PublicReport = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

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
      <FeaturesSection />
      <TestsSection />
      <div id="report-form">
        <ReportForm />
      </div>
      <MobileReportTrigger 
        isDrawerOpen={isDrawerOpen}
        onOpenDrawer={handleOpenDrawer}
      />
      <DesktopStickyTrigger onGetReportClick={handleGetReportClick} />
      <MobileReportDrawer 
        isOpen={isDrawerOpen} 
        onClose={handleCloseDrawer} 
      />
    </div>
  );
};

export default PublicReport;
