
import React from 'react';
import { PublicReportForm } from '@/components/public-report/PublicReportForm';

interface ReportFormProps {
  showReportGuide?: boolean;
  setShowReportGuide?: (show: boolean) => void;
}

export const ReportForm = ({ showReportGuide, setShowReportGuide }: ReportFormProps) => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Get Your Personalized Report</h2>
            <p className="text-muted-foreground text-lg">
              Choose your report type and provide your birth details for accurate insights
            </p>
          </div>
          <PublicReportForm 
            showReportGuide={showReportGuide}
            setShowReportGuide={setShowReportGuide}
          />
        </div>
      </div>
    </section>
  );
};
