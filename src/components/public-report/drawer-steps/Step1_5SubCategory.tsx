import React, { useEffect, useRef } from 'react';
import { Controller, UseFormSetValue } from 'react-hook-form';
import { motion } from 'framer-motion';
import { User, Briefcase, Heart, Target, Calendar, Brain, ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportFormData } from '@/types/public-report';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { useMobileSafeTopPadding } from '@/hooks/useMobileSafeTopPadding';

interface Step1_5SubCategoryProps {
  control: any;
  setValue: UseFormSetValue<ReportFormData>;
  selectedCategory: string;
  selectedSubCategory: string;
  onNext?: () => void;
}

const subCategoryOptions = {
  'the-self': [
    {
      value: 'personal',
      title: 'Personal',
      description: 'Deep self-awareness and unlock your authentic potential',
      icon: User,
      essenceType: 'personal',
    },
    {
      value: 'professional',
      title: 'Professional',
      description: 'Career mastery and unlock your professional strengths',
      icon: Briefcase,
      essenceType: 'professional',
    },
    {
      value: 'relational',
      title: 'Relational',
      description: 'Master connections and deepen your relationship',
      icon: Heart,
      essenceType: 'relational',
    },
  ],
  'compatibility': [
    {
      value: 'personal',
      title: 'Personal',
      description: 'Romantic chemistry and build deeper personal bonds',
      icon: Users,
      relationshipType: 'personal',
    },
    {
      value: 'professional',
      title: 'Professional',
      description: 'Unlock powerful collaboration dynamics with a team',
      icon: Briefcase,
      relationshipType: 'professional',
    },
  ],
  'snapshot': [
    // Monthly removed - no longer available for selection
  ],
};

const getHeadingText = (category: string) => {
  switch (category) {
    case 'the-self':
      return 'Choose area of Personal Self to get Guidance';
    case 'compatibility':
      return 'Select the type of insights to compare';
    case 'snapshot':
      return 'What area would you like guidance on?';
    default:
      return 'What area would you like guidance on?';
  }
};

const Step1_5SubCategory = ({ control, setValue, selectedCategory, selectedSubCategory, onNext }: Step1_5SubCategoryProps) => {
  const { getReportPrice } = usePriceFetch();
  const options = subCategoryOptions[selectedCategory as keyof typeof subCategoryOptions] || [];
  const containerRef = useRef<HTMLDivElement>(null);

  // Removed auto-scroll to top - let user control scrolling

  // Mirror desktop handleSubCategoryClick logic
  const handleSubCategoryClick = (value: string, reportType: string, onChange: (v: any) => void) => {
    onChange(value);
    setValue?.('reportType', reportType, { shouldValidate: true });
    
    // Removed auto-advance - let user manually proceed
  };

  // Mirror desktop handleAstroDataClick logic
  const handleAstroDataClick = (value: string, reportType: string, onChange: (v: any) => void) => {
    onChange(value);

    // For astro data, the request field IS the report type
    setValue?.('request', value, { shouldValidate: true });
    
    // Clear reportType since astro data uses request field instead
    setValue?.('reportType', '', { shouldValidate: true });
    
    // Removed auto-advance - let user manually proceed
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pt-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-light tracking-tight text-[hsl(var(--apple-gray-dark))]">{getHeadingText(selectedCategory)}</h2>
      </div>

      <Controller
        control={control}
        name="reportSubCategory"
        render={({ field }) => (
          <div className="space-y-4">
            {options.map((option) => {
              const IconComponent = option.icon;
              const isSelected = field.value === option.value;
              
              // Calculate price using unified pricing logic
              let reportType = '';
              if (selectedCategory === 'the-self' && 'essenceType' in option) {
                reportType = `essence_${option.essenceType}`;
              } else if (selectedCategory === 'compatibility' && 'relationshipType' in option) {
                reportType = `sync_${option.relationshipType}`;
              } else if (selectedCategory === 'snapshot' && 'reportType' in option) {
                reportType = option.reportType;
              }
              
              const price = reportType ? getReportPrice({ reportType }) : 0;
              const formatPrice = (price: number) => `$${Math.round(price)}`;
              
              return (
                <motion.button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    // Mirror desktop logic exactly based on category
                    if (selectedCategory === 'the-self' && 'essenceType' in option) {
                      // For essence: set essenceType first, then combined reportType is set by useEffect in desktop
                      field.onChange(option.value);
                      setValue('essenceType', option.essenceType);
                      setValue('reportType', `essence_${option.essenceType}`, { shouldValidate: true });
                    } else if (selectedCategory === 'compatibility' && 'relationshipType' in option) {
                      // For relationships: set relationshipType first, then combined reportType is set by useEffect in desktop
                      field.onChange(option.value);
                      setValue('relationshipType', option.relationshipType);
                      setValue('reportType', `sync_${option.relationshipType}`, { shouldValidate: true });
                    } else if (selectedCategory === 'snapshot' && 'reportType' in option) {
                      // For snapshots: set reportType directly
                      handleSubCategoryClick(option.value, option.reportType, field.onChange);
                      return;
                    } else if (selectedCategory === 'astro-data' && 'reportType' in option) {
                      // For astro-data: use request field, clear reportType
                      handleAstroDataClick(option.value, option.reportType, field.onChange);
                      return;
                    }
                    
                    // Removed auto-advance - let user manually proceed
                  }}
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
                        }`}>{option.title}</h3>
                        {reportType && (
                          <span className={`text-sm font-semibold transition-colors duration-300 ${
                            isSelected 
                              ? 'text-[hsl(var(--apple-blue))]' 
                              : 'text-[hsl(var(--apple-gray-dark))]'
                          }`}>
                            {formatPrice(price)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[hsl(var(--apple-gray))] font-light leading-relaxed">{option.description}</p>
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

export default Step1_5SubCategory;
