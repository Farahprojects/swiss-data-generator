import React from 'react';
import { Controller, UseFormSetValue } from 'react-hook-form';
import { motion } from 'framer-motion';
import { astroDataSubCategories } from '@/constants/report-types';
import { ReportFormData } from '@/types/public-report';
import { usePriceFetch } from '@/hooks/usePriceFetch';

interface Step1_5AstroDataProps {
  control: any;
  setValue: UseFormSetValue<ReportFormData>;
  onNext: () => void;
  selectedSubCategory: string;
}

const Step1_5AstroData = ({ control, setValue, onNext, selectedSubCategory }: Step1_5AstroDataProps) => {
  const { getReportPrice } = usePriceFetch();

  // Get price for astro data type using same logic as desktop
  const getAstroDataPrice = (astroDataType: string): string => {
    try {
      const price = getReportPrice({ 
        reportCategory: 'astro-data',
        astroDataType: astroDataType 
      });
      return `$${price}`;
    } catch (error) {
      console.warn('Price fetch failed for astro data type:', astroDataType, error);
      return '$0';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">Choose your astro data type</h2>
        <p className="text-sm text-gray-600">Raw ephemeris data - instant calculations</p>
      </div>

      <Controller
        control={control}
        name="astroDataType"
        render={({ field }) => (
          <div className="space-y-4">
            {astroDataSubCategories.map((subCategory) => {
              const IconComponent = subCategory.icon;
              const isSelected = field.value === subCategory.value;
              const price = getAstroDataPrice(subCategory.value);
              
              return (
                <motion.button
                  key={subCategory.value}
                  type="button"
                  onClick={() => {
                    field.onChange(subCategory.value);
                    setValue('reportType', subCategory.reportType);
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
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{subCategory.title}</h3>
                        <span className="text-sm font-bold text-primary">
                          {price}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{subCategory.description}</p>
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

export default Step1_5AstroData;