
import React from 'react';
import { Controller, UseFormSetValue } from 'react-hook-form';
import { motion } from 'framer-motion';
import { reportCategories } from '@/constants/report-types';
import { ReportFormData } from '@/types/public-report';

interface Step1ReportTypeProps {
  control: any;
  setValue: UseFormSetValue<ReportFormData>;
  onNext: () => void;
  selectedCategory: string;
}

const Step1ReportType = ({ control, setValue, onNext, selectedCategory }: Step1ReportTypeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">What area would you like guidance on?</h2>
      </div>

      <Controller
        control={control}
        name="reportCategory"
        render={({ field }) => (
          <div className="space-y-4">
            {reportCategories.map((category) => {
              const IconComponent = category.icon;
              const isSelected = field.value === category.value;
              
              return (
                <motion.button
                  key={category.value}
                  type="button"
                  onClick={() => {
                    field.onChange(category.value);
                    // Also set the reportType for desktop compatibility
                    setValue('reportType', category.reportType);
                    // Auto-advance to next step after selection
                    setTimeout(() => onNext(), 100);
                  }}
                  className={`w-full p-6 rounded-2xl border transition-all duration-200 shadow-md bg-white/60 backdrop-blur-sm hover:shadow-lg active:scale-[0.98] ${
                    isSelected 
                      ? 'border-primary shadow-lg' 
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex gap-4 items-center">
                    <div className="bg-white shadow-inner w-12 h-12 flex items-center justify-center rounded-full">
                      <IconComponent className="h-6 w-6 text-gray-700" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-lg font-semibold text-gray-900">{category.title}</h3>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      />
    </motion.div>
  );
};

export default Step1ReportType;
