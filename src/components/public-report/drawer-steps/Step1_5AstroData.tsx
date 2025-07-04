
import React, { useMemo } from 'react';
import { Controller, UseFormSetValue } from 'react-hook-form';
import { motion } from 'framer-motion';
import { astroDataSubCategories } from '@/constants/report-types';
import { ReportFormData } from '@/types/public-report';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBatchedLogging } from '@/hooks/use-batched-logging';

interface Step1_5AstroDataProps {
  control: any;
  setValue: UseFormSetValue<ReportFormData>;
  onNext: () => void;
  selectedSubCategory: string;
}

const Step1_5AstroData = ({ control, setValue, onNext, selectedSubCategory }: Step1_5AstroDataProps) => {
  const { getReportPrice } = usePriceFetch();
  const isMobile = useIsMobile();
  const { logAction } = useBatchedLogging();

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
              
              // Memoized price calculation to handle mobile race conditions
              const price = useMemo(() => {
                const formData = {
                  request: subCategory.value,
                  reportCategory: 'astro-data',
                  astroDataType: subCategory.value
                };
                
                try {
                  return getReportPrice(formData);
                } catch (error) {
                  // Log mobile price calculation errors in production
                  if (isMobile && process.env.NODE_ENV === 'production') {
                    logAction('AstroData price calculation error', 'error', {
                      subCategoryValue: subCategory.value,
                      formData,
                      error: error instanceof Error ? error.message : 'Unknown error',
                      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
                    });
                  }
                  return 0; // Fallback price
                }
              }, [subCategory.value]);
              
              const formatPrice = (price: number) => `$${Math.round(price)}`;
              
              const handleClick = () => {
                // Log mobile touch events in production for debugging
                if (isMobile && process.env.NODE_ENV === 'production') {
                  logAction('AstroData button tap', 'info', {
                    selectedValue: subCategory.value,
                    reportType: subCategory.reportType,
                    calculatedPrice: price,
                    timestamp: new Date().toISOString(),
                    touchSupported: typeof window !== 'undefined' && 'ontouchstart' in window
                  });
                }
                
                field.onChange(subCategory.value);
                setValue('reportType', subCategory.reportType);
                setTimeout(() => onNext(), 100);
              };
              
              return (
                <motion.button
                  key={subCategory.value}
                  type="button"
                  onClick={handleClick}
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
                          {formatPrice(price)}
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
