
import React from 'react';
import { Controller } from 'react-hook-form';
import { motion } from 'framer-motion';
import { User, Briefcase, Heart, Target, Calendar, Brain } from 'lucide-react';
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
      description: 'Self-awareness and inner growth',
      icon: User,
    },
    {
      value: 'professional',
      title: 'Professional',
      description: 'Career and work dynamics',
      icon: Briefcase,
    },
    {
      value: 'relational',
      title: 'Relational',
      description: 'How you connect with others',
      icon: Heart,
    },
  ],
  'compatibility': [
    {
      value: 'personal',
      title: 'Personal',
      description: 'Romantic and personal relationships',
      icon: Heart,
    },
    {
      value: 'professional',
      title: 'Professional',
      description: 'Work and team compatibility',
      icon: Briefcase,
    },
  ],
  'snapshot': [
    {
      value: 'focus',
      title: 'Focus',
      description: 'Best times for productivity and rest',
      icon: Target,
    },
    {
      value: 'monthly',
      title: 'Monthly Energy',
      description: 'Your energy forecast this month',
      icon: Calendar,
    },
    {
      value: 'mindset',
      title: 'Mindset',
      description: 'Mental clarity and mood insights',
      icon: Brain,
    },
  ],
};

const Step1_5SubCategory = ({ control, onNext, onPrev, selectedCategory, selectedSubCategory }: Step1_5SubCategoryProps) => {
  const options = subCategoryOptions[selectedCategory as keyof typeof subCategoryOptions] || [];
  
  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'the-self': return 'The Self';
      case 'compatibility': return 'Compatibility';
      case 'snapshot': return 'Snapshot';
      default: return '';
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
        <h2 className="text-2xl font-bold text-gray-900">What area would you like guidance on?</h2>
      </div>

      <Controller
        control={control}
        name="reportSubCategory"
        render={({ field }) => (
          <div className="space-y-3">
            {options.map((option) => {
              const IconComponent = option.icon;
              const isSelected = field.value === option.value;
              
              return (
                <motion.button
                  key={option.value}
                  type="button"
                  onClick={() => field.onChange(option.value)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                    isSelected 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${isSelected ? 'bg-white' : 'bg-white/70'}`}>
                      <IconComponent className="h-6 w-6 text-gray-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{option.title}</h3>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      />

      <div className="flex space-x-3">
        <Button
          onClick={onPrev}
          variant="outline"
          className="flex-1 h-12 text-lg font-semibold border-2 border-primary text-primary bg-white hover:bg-accent"
          size="lg"
        >
          Back
        </Button>
        
        {selectedSubCategory && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1"
          >
            <Button
              onClick={onNext}
              variant="outline"
              className="w-full h-12 text-lg font-semibold border-2 border-primary text-primary bg-white hover:bg-accent"
              size="lg"
            >
              Choose Insight
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default Step1_5SubCategory;
