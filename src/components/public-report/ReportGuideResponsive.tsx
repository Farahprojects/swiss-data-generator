
import React from 'react';
import { ResponsiveReportDialog } from '@/components/shared/ResponsiveReportDialog';

interface ReportGuideResponsiveProps {
  isOpen: boolean;
  onClose: () => void;
  targetReportType?: string | null;
}

const ReportGuideResponsive = ({ isOpen, onClose, targetReportType }: ReportGuideResponsiveProps) => {
  return (
    <ResponsiveReportDialog
      isOpen={isOpen}
      onClose={onClose}
    />
  );
};

export default ReportGuideResponsive;
