
import React from 'react';
import { Control } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ReportFormData } from '@/types/public-report';
import ReportTypeSelector from '@/components/public-report/ReportTypeSelector';

interface Step1ReportTypeProps {
  control: Control<ReportFormData>;
  onNext: () => void;
  selectedReportType: string;
}

const Step1ReportType = ({ control, onNext, selectedReportType }: Step1ReportTypeProps) => {
  const canProceed = !!selectedReportType;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Report</h2>
        <p className="text-gray-600">Select the type of astrological report you'd like</p>
      </div>

      <ReportTypeSelector
        control={control}
        errors={{}}
        selectedReportType={selectedReportType}
        showReportGuide={false}
        setShowReportGuide={() => {}}
      />

      {canProceed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            onClick={onNext}
            className="w-full h-12 text-lg font-semibold"
            size="lg"
          >
            Continue
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Step1ReportType;
