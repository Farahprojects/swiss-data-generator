
import React from 'react';
import { Control } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportFormData } from '@/types/public-report';

interface Step1_5SubCategoryProps {
  control: Control<ReportFormData>;
  onNext: () => void;
  onPrev: () => void;
  selectedReportType: string;
}

const Step1_5SubCategory = ({ control, onNext, onPrev, selectedReportType }: Step1_5SubCategoryProps) => {
  // For now, just continue to next step as sub-categories are handled by the main ReportTypeSelector
  React.useEffect(() => {
    // Auto-advance if we have a report type selected
    if (selectedReportType) {
      onNext();
    }
  }, [selectedReportType, onNext]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          className="p-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="text-center flex-1">
          <h2 className="text-2xl font-bold text-gray-900">Loading...</h2>
        </div>
      </div>
    </motion.div>
  );
};

export default Step1_5SubCategory;
