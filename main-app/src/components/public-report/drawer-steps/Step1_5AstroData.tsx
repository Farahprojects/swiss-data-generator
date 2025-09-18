
import React, { useMemo } from 'react';
import { Controller, UseFormSetValue } from 'react-hook-form';
import { motion } from 'framer-motion';
import { astroRequestCategories } from '@/constants/report-types';
import { ReportFormData } from '@/types/public-report';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileSafeTopPadding } from '@/hooks/useMobileSafeTopPadding';

interface Step1_5AstroDataProps {
  control: any;
  setValue: UseFormSetValue<ReportFormData>;
  selectedSubCategory: string;
  onNext?: () => void;
}

const Step1_5AstroData = ({ control, setValue, selectedSubCategory, onNext }: Step1_5AstroDataProps) => {
  const { getReportPrice } = usePriceFetch();
  const isMobile = useIsMobile();

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
            {astroRequestCategories.map((subCategory) => {
              const IconComponent = subCategory.icon;
              const isSelected = field.value === subCategory.value;
              
              // Use unified pricing logic (same as desktop)
              const price = useMemo(() => {
                const formData = {
                  reportType: subCategory.value // Use reportType for astro data consistency
                };
                
                try {
                  return getReportPrice(formData);
                } catch (error) {
                  // Silently handle pricing errors and provide fallback
                  if (process.env.NODE_ENV === 'development') {
                    console.warn('Price calculation error (using fallback):', error);
                  }
                  
                  
                  // Return fallback price to prevent UI breakage
                  return 19.99;
                }
              }, [subCategory.value]);
              
              const formatPrice = (price: number) => `$${Math.round(price)}`;
              
              const handleClick = () => {
                field.onChange(subCategory.value);
                
                // Use unified form data structure (set both for consistency)
                setValue('request', subCategory.value);
                setValue('reportType', subCategory.value);
                
                // Removed auto-advance - let user manually proceed
              };
              
              return (
                <motion.button
                  key={subCategory.value}
                  type="button"
                  onClick={handleClick}
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
                      <div className="flex justify-between items-start mb-1">
                        <h3 className={`text-lg font-medium transition-colors duration-300 ${
                          isSelected 
                            ? 'text-[hsl(var(--apple-blue))]' 
                            : 'text-[hsl(var(--apple-gray-dark))]'
                        }`}>{subCategory.title}</h3>
                        <span className={`text-sm font-semibold transition-colors duration-300 ${
                          isSelected 
                            ? 'text-[hsl(var(--apple-blue))]' 
                            : 'text-[hsl(var(--apple-gray-dark))]'
                        }`}>
                          {formatPrice(price)}
                        </span>
                      </div>
                      <p className="text-sm text-[hsl(var(--apple-gray))] font-light leading-relaxed">{subCategory.description}</p>
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
