
import React, { useState } from 'react';
import HeroSection from '@/components/public-report/HeroSection';
import FeaturesSection from '@/components/public-report/FeaturesSection';
import TestsSection from '@/components/public-report/TestsSection';
import WhyChooseSection from '@/components/public-report/WhyChooseSection';
import { ReportForm } from '@/components/shared/ReportForm';
import MobileReportTrigger from '@/components/public-report/MobileReportTrigger';
import MobileReportDrawer from '@/components/public-report/MobileReportDrawer';
import ReportGuideResponsive from '@/components/public-report/ReportGuideResponsive';
import Footer from '@/components/Footer';
import { useIsMobile } from '@/hooks/use-mobile';

const PublicReport = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showReportGuide, setShowReportGuide] = useState(false);
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
      {!isMobile && (
        <div id="report-form">
          <ReportForm 
            showReportGuide={showReportGuide}
            setShowReportGuide={setShowReportGuide}
          />
        </div>
      )}
      <MobileReportTrigger 
        isDrawerOpen={isDrawerOpen}
        onOpenDrawer={handleOpenDrawer}
      />
      <MobileReportDrawer 
        isOpen={isDrawerOpen} 
        onClose={handleCloseDrawer}
        showReportGuide={showReportGuide}
        setShowReportGuide={setShowReportGuide}
      />
      <WhyChooseSection />
      <ReportGuideResponsive 
        isOpen={showReportGuide} 
        onClose={() => setShowReportGuide(false)} 
      />
      <Footer />
    </div>
  );
};

export default PublicReport;
