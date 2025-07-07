import React, { useEffect, useRef } from 'react';
import { Controller, UseFormSetValue } from 'react-hook-form';
import { motion } from 'framer-motion';
import { User, Briefcase, Heart, Target, Calendar, Brain, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportFormData } from '@/types/public-report';

interface Step1_5SubCategoryProps {
  control: any;
  setValue: UseFormSetValue<ReportFormData>;
  onNext: () => void;
  onPrev: () => void;
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

const Step1_5SubCategory = ({ control, setValue, onNext, onPrev, selectedCategory, selectedSubCategory }: Step1_5SubCategoryProps) => {
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
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">{getHeadingText(selectedCategory)}</h2>
      </div>

      <Controller
        control={control}
        name="reportSubCategory"
        render={({ field }) => (
          <div className="space-y-4">
            {options.map((option) => {
              const IconComponent = option.icon;
              const isSelected = field.value === option.value;
              const isFocus = option.value === 'focus';
              
              return (
                <motion.button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    field.onChange(option.value);
                    
                    // Set the appropriate type fields based on category
                    if (selectedCategory === 'the-self' && 'essenceType' in option) {
                      setValue('essenceType', option.essenceType);
                    } else if (selectedCategory === 'compatibility' && 'relationshipType' in option) {
                      setValue('relationshipType', option.relationshipType);
                    } else if (selectedCategory === 'snapshot' && 'reportType' in option) {
                      setValue('reportType', option.reportType);
                    }
                  }}
                  className={`w-full flex items-center gap-4 rounded-xl border px-4 py-3 transition-all duration-150
                    ${isFocus ? 'border-red-600 bg-red-50' : isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                  aria-pressed={isSelected}
                >
                  <IconComponent className={`w-6 h-6 ${isFocus ? 'text-red-600' : 'text-blue-600'}`} />
                  <span className="text-lg font-medium text-gray-900">{option.title}</span>
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
