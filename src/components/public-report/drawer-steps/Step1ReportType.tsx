
import React from 'react';
import { Controller, UseFormSetValue } from 'react-hook-form';
import { motion } from 'framer-motion';
import { astroRequestCategories } from '@/constants/report-types';
import { ReportFormData } from '@/types/public-report';
import { useMobileSafeTopPadding } from '@/hooks/useMobileSafeTopPadding';

interface Step1ReportTypeProps {
  control: any;
  setValue: UseFormSetValue<ReportFormData>;
  selectedCategory: string;
  onNext?: () => void;
}

const Step1ReportType = ({ control, setValue, selectedCategory, onNext }: Step1ReportTypeProps) => {

  // Mirror desktop astro data click logic
  const handleAstroDataClick = (
    value: string,
    reportType: string,
    onChange: (v: any) => void,
  ) => {
    onChange(value);
    // For astro data, the request field IS the report type
    setValue('request', value, { shouldValidate: true });
    // Clear reportType since astro data uses request field instead
    setValue('reportType', '', { shouldValidate: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pt-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-light tracking-tight text-[hsl(var(--apple-gray-dark))]">Choose your <em className="font-normal">astro data</em> type</h2>
        <p className="text-sm text-[hsl(var(--apple-gray))] font-light">Raw ephemeris data - instant calculations</p>
      </div>

      <Controller
        control={control}
        name="request"
        render={({ field }) => (
          <div className="space-y-4">
            {astroRequestCategories.map((category) => {
              const IconComponent = category.icon;
              const isSelected = field.value === category.value;
              
              return (
                <motion.button
                  key={category.value}
                  type="button"
                  onClick={() => handleAstroDataClick(category.value, category.request, field.onChange)}
                  className={`w-full p-6 rounded-3xl border transition-all duration-300 ease-out active:scale-95 min-h-[80px] ${
                    isSelected 
                      ? 'border-primary bg-primary/5 shadow-lg' 
                      : 'border-neutral-200 bg-white hover:bg-gray-50 hover:border-neutral-300 shadow-md'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 flex items-center justify-center rounded-full bg-white shadow-[var(--apple-shadow-sm)] transition-all duration-300">
                      <IconComponent className="h-7 w-7 text-[hsl(var(--apple-gray-dark))] transition-colors duration-300" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className={`text-lg font-medium transition-colors duration-300 ${
                        isSelected 
                          ? 'text-[hsl(var(--apple-blue))]' 
                          : 'text-[hsl(var(--apple-gray-dark))]'
                      }`}>{category.title}</h3>
                      <p className="text-sm text-[hsl(var(--apple-gray))] font-light leading-relaxed">{category.description}</p>
                      <div className="mt-2 text-xs text-green-600 font-medium">
                        ⚡ Instant delivery (~5 seconds)
                      </div>
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
