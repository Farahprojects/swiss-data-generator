
import React from 'react';
import { Controller } from 'react-hook-form';
import { motion } from 'framer-motion';
import { User, Briefcase, Heart, Target, Calendar, Brain, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Step1_5SubCategoryProps {
  control: any;
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
    },
    {
      value: 'professional',
      title: 'Professional',
      description: 'Career mastery and unlock your professional strengths',
      icon: Briefcase,
    },
    {
      value: 'relational',
      title: 'Relational',
      description: 'Master connections and deepen your relationship patterns',
      icon: Heart,
    },
  ],
  'compatibility': [
    {
      value: 'personal',
      title: 'Personal',
      description: 'Romantic chemistry and build deeper personal bonds',
      icon: Heart,
    },
    {
      value: 'professional',
      title: 'Professional',
      description: 'Team synergy and unlock powerful collaboration dynamics',
      icon: Briefcase,
    },
  ],
  'snapshot': [
    {
      value: 'focus',
      title: 'Focus',
      description: 'Optimal timing insights for peak productivity and clarity',
      icon: Target,
    },
    {
      value: 'monthly',
      title: 'Monthly Energy',
      description: 'Your personal energy forecast and monthly momentum guide',
      icon: Calendar,
    },
    {
      value: 'mindset',
      title: 'Mindset',
      description: 'Mental clarity insights and unlock your cognitive patterns',
      icon: Brain,
    },
  ],
};

const Step1_5SubCategory = ({ control, onNext, onPrev, selectedCategory, selectedSubCategory }: Step1_5SubCategoryProps) => {
  const options = subCategoryOptions[selectedCategory as keyof typeof subCategoryOptions] || [];
  
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
        name="reportSubCategory"
        render={({ field }) => (
          <div className="space-y-4">
            {options.map((option) => {
              const IconComponent = option.icon;
              const isSelected = field.value === option.value;
              
              return (
                <motion.button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    field.onChange(option.value);
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
                      <h3 className="text-lg font-semibold text-gray-900">{option.title}</h3>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      />

      {/* Compact back button with icon */}
      <div className="flex justify-start">
        <Button
          onClick={onPrev}
          variant="outline"
          className="inline-flex items-center gap-2 px-4 py-2 h-10 text-sm font-medium border-2 border-primary text-primary bg-white hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
    </motion.div>
  );
};

export default Step1_5SubCategory;
