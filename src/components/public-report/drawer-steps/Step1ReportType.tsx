
import React from 'react';
import { Controller } from 'react-hook-form';
import { motion } from 'framer-motion';
import { User, Heart, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Step1ReportTypeProps {
  control: any;
  onNext: () => void;
  selectedCategory: string;
}

const reportCategories = [
  {
    value: 'the-self',
    title: 'The Self',
    description: 'Personal growth and self-discovery',
    icon: User,
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    selectedColor: 'bg-blue-100 border-blue-500',
  },
  {
    value: 'compatibility',
    title: 'Compatibility',
    description: 'Relationship dynamics and synergy',
    icon: Heart,
    color: 'bg-pink-50 border-pink-200 hover:bg-pink-100',
    selectedColor: 'bg-pink-100 border-pink-500',
  },
  {
    value: 'snapshot',
    title: 'Snapshot',
    description: 'Current life focus and timing',
    icon: Target,
    color: 'bg-green-50 border-green-200 hover:bg-green-100',
    selectedColor: 'bg-green-100 border-green-500',
  },
];

const Step1ReportType = ({ control, onNext, selectedCategory }: Step1ReportTypeProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Insight Area</h2>
        <p className="text-gray-600">What area would you like guidance on?</p>
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
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                    isSelected ? category.selectedColor : category.color
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-full ${isSelected ? 'bg-white' : 'bg-white/70'}`}>
                      <IconComponent className="h-6 w-6 text-gray-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{category.title}</h3>
                      <p className="text-sm text-gray-600">{category.description}</p>
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
        >
          <Button
            onClick={onNext}
            variant="outline"
            className="w-full h-12 text-lg font-semibold border-2 border-purple-500 text-purple-500 bg-white hover:bg-purple-50"
            size="lg"
          >
            Choose Focus
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Step1ReportType;
