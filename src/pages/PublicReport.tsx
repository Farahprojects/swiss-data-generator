
import React from 'react';
import HeroSection from '@/components/public-report/HeroSection';
import FeaturesSection from '@/components/public-report/FeaturesSection';
import TestsSection from '@/components/public-report/TestsSection';
import { ReportForm } from '@/components/shared/ReportForm';
import MobileReportTrigger from '@/components/public-report/MobileReportTrigger';
import DesktopStickyTrigger from '@/components/public-report/DesktopStickyTrigger';

const PublicReport = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <FeaturesSection />
      <TestsSection />
      <div id="report-form">
        <ReportForm />
      </div>
      <MobileReportTrigger />
      <DesktopStickyTrigger />
    </div>
  );
};

export default PublicReport;
