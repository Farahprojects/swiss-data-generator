import React, { useEffect, useRef } from 'react';
import { Controller, UseFormSetValue } from 'react-hook-form';
import { motion } from 'framer-motion';
import { User, Briefcase, Heart, Target, Calendar, Brain, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportFormData } from '@/types/public-report';
import { usePriceFetch } from '@/hooks/usePriceFetch';
import { useMobileSafeTopPadding } from '@/hooks/useMobileSafeTopPadding';

interface Step1_5SubCategoryProps {
  control: any;
  setValue: UseFormSetValue<ReportFormData>;
  selectedCategory: string;
  selectedSubCategory: string;
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
      icon: Heart,
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
    {
      value: 'focus',
      title: 'Focus',
      description: 'Optimal timing insights for peak productivity and clarity',
      icon: Target,
      reportType: 'focus',
    },
    {
      value: 'monthly',
      title: 'Monthly Energy',
      description: 'Your personal energy forecast and monthly momentum guide',
      icon: Calendar,
      reportType: 'monthly',
    },
    {
      value: 'mindset',
      title: 'Mindset',
      description: 'Mental clarity insights and unlock your cognitive patterns',
      icon: Brain,
      reportType: 'mindset',
    },
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

const Step1_5SubCategory = ({ control, setValue, selectedCategory, selectedSubCategory }: Step1_5SubCategoryProps) => {
  const { getReportPrice } = usePriceFetch();
  const options = subCategoryOptions[selectedCategory as keyof typeof subCategoryOptions] || [];
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when this step is rendered (mobile UX)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

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
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{getHeadingText(selectedCategory)}</h2>
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
                    field.onChange(option.value);
                    
                    // Use unified reportType setting logic (same as desktop)
                    if (selectedCategory === 'the-self' && 'essenceType' in option) {
                      setValue('reportType', `essence_${option.essenceType}`);
                      setValue('essenceType', option.essenceType);
                    } else if (selectedCategory === 'compatibility' && 'relationshipType' in option) {
                      setValue('reportType', `sync_${option.relationshipType}`);
                      setValue('relationshipType', option.relationshipType);
                    } else if (selectedCategory === 'snapshot' && 'reportType' in option) {
                      setValue('reportType', option.reportType);
                    }
                  }}
                  className={`w-full p-6 rounded-2xl border transition-all duration-200 shadow-md bg-background/60 backdrop-blur-sm hover:shadow-lg active:scale-[0.98] ${
                    isSelected 
                      ? 'border-primary shadow-lg' 
                      : 'border-border hover:border-muted-foreground'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex gap-4 items-center">
                    <div className="bg-background shadow-inner w-12 h-12 flex items-center justify-center rounded-full">
                      <IconComponent className="h-6 w-6 text-gray-700" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-lg font-semibold text-foreground">{option.title}</h3>
                        {reportType && (
                          <span className="text-sm font-bold text-primary">
                            {formatPrice(price)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
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
