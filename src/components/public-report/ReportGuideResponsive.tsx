
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import ReportGuideModal from './ReportGuideModal';
import ReportGuideDrawer from './ReportGuideDrawer';

interface ReportGuideResponsiveProps {
  isOpen: boolean;
  onClose: () => void;
  targetReportType?: string | null;
}

const ReportGuideResponsive = ({ isOpen, onClose, targetReportType }: ReportGuideResponsiveProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <ReportGuideDrawer 
        isOpen={isOpen} 
        onClose={onClose}
        targetReportType={targetReportType}
      />
    );
  }

  return (
    <ReportGuideModal 
      isOpen={isOpen} 
      onClose={onClose}
      targetReportType={targetReportType}
    />
  );
};

export default ReportGuideResponsive;
