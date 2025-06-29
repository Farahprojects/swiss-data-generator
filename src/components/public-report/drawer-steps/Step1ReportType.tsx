
import React from 'react';
import { Controller } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Briefcase, Heart, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Step1ReportTypeProps {
  control: any;
  onNext: () => void;
  selectedCategory: string;
}

const reportCategories = [
  {
    value: 'professional',
    title: 'Professional',
    description: 'Career, business, work dynamics',
    icon: Briefcase,
  },
  {
    value: 'relational',
    title: 'Relational',
    description: 'Love, relationships, compatibility',
    icon: Heart,
  },
  {
    value: 'personal',
    title: 'Personal',
    description: 'Self-discovery, life path, essence',
    icon: User,
  },
];

const Step1ReportType = ({ control, onNext, selectedCategory }: Step1ReportTypeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-semibold text-gray-900">Choose Your Report Type</h2>
        <p className="text-gray-500 text-base">What area would you like insight into?</p>
      </div>

      <Controller
        control={control}
        name="reportCategory"
        render={({ field }) => (
          <div className="space-y-3">
            {reportCategories.map((category) => {
              const IconComponent = category.icon;
              const isSelected = field.value === category.value;
              
              return (
                <motion.button
                  key={category.value}
                  type="button"
                  onClick={() => field.onChange(category.value)}
                  className={`w-full p-5 rounded-2xl border transition-all duration-200 text-left ${
                    isSelected 
                      ? 'bg-gray-50 border-gray-300 shadow-sm' 
                      : 'bg-white border-gray-200 hover:bg-gray-25 hover:border-gray-250'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <IconComponent className={`h-6 w-6 ${isSelected ? 'text-gray-700' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">{category.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{category.description}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      />

      {selectedCategory && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="pt-2"
        >
          <Button
            onClick={onNext}
            className="w-full h-12 text-base font-medium bg-gray-900 hover:bg-gray-800 text-white rounded-xl"
            size="lg"
          >
            Continue
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Step1ReportType;
