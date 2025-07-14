
import React from 'react';
import { Controller, UseFormSetValue } from 'react-hook-form';
import { motion } from 'framer-motion';
import { reportCategories } from '@/constants/report-types';
import { ReportFormData } from '@/types/public-report';
import { useMobileSafeTopPadding } from '@/hooks/useMobileSafeTopPadding';

interface Step1ReportTypeProps {
  control: any;
  setValue: UseFormSetValue<ReportFormData>;
  selectedCategory: string;
  onNext?: () => void;
}

const Step1ReportType = ({ control, setValue, selectedCategory, onNext }: Step1ReportTypeProps) => {

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pt-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-light tracking-tight text-[hsl(var(--apple-gray-dark))]">What area would you like <em className="font-normal">guidance</em> on?</h2>
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
                    // Only set reportType for non-astro-data categories
                    if (category.value !== 'astro-data') {
                      setValue('reportType', category.reportType);
                    } else {
                      // Clear reportType for astro-data since it uses request field
                      setValue('reportType', '');
                    }
                    
                    // Auto-advance to next step after selection with a small delay
                    setTimeout(() => {
                      onNext?.();
                    }, 600);
                  }}
                  className={`w-full p-6 rounded-3xl border transition-all duration-300 ease-out active:scale-95 min-h-[80px] ${
                    isSelected 
                      ? 'border-[hsl(var(--apple-blue))] bg-[hsl(var(--apple-blue))]/5 shadow-[var(--apple-shadow-lg)]' 
                      : 'border-[hsl(var(--apple-gray-light))] bg-white hover:bg-gray-50 hover:border-[hsl(var(--apple-gray))] shadow-[var(--apple-shadow-sm)]'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="flex gap-4 items-center">
                    <div className={`w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300 ${
                      isSelected 
                        ? 'bg-[hsl(var(--apple-blue))] shadow-[var(--apple-shadow-md)]' 
                        : 'bg-white shadow-[var(--apple-shadow-sm)]'
                    }`}>
                      <IconComponent className={`h-7 w-7 transition-colors duration-300 ${
                        isSelected 
                          ? 'text-white' 
                          : 'text-[hsl(var(--apple-gray-dark))]'
                      }`} />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className={`text-lg font-medium transition-colors duration-300 ${
                        isSelected 
                          ? 'text-[hsl(var(--apple-blue))]' 
                          : 'text-[hsl(var(--apple-gray-dark))]'
                      }`}>{category.title}</h3>
                      <p className="text-sm text-[hsl(var(--apple-gray))] font-light leading-relaxed">{category.description}</p>
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
