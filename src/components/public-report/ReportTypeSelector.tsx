
import React, { useState } from 'react';
import { Control, Controller, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { motion } from 'framer-motion';
import { User, Heart, Target, Calendar, Brain } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { relationshipTypes, essenceTypes } from '@/constants/report-types';
import { ReportFormData } from '@/types/public-report';
import FormStep from './FormStep';
import ReportGuideModal from './ReportGuideModal';

interface ReportTypeSelectorProps {
  control: Control<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  selectedReportType: string;
  showReportGuide: boolean;
  setShowReportGuide: (show: boolean) => void;
  setValue?: UseFormSetValue<ReportFormData>;
}

const reportCategories = [
  {
    value: 'the-self',
    title: 'The Self',
    description: 'Unlock your authentic self and discover your hidden potential',
    icon: User,
    reportType: 'essence',
  },
  {
    value: 'compatibility',
    title: 'Compatibility',
    description: 'Discover relationship dynamics and unlock deeper connections',
    icon: Heart,
    reportType: 'sync',
  },
  {
    value: 'snapshot',
    title: 'Snapshot',
    description: 'Perfect timing insights for your current life chapter',
    icon: Target,
    reportType: 'focus',
  },
];

const snapshotSubCategories = [
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
];

const ReportTypeSelector = ({ 
  control, 
  errors, 
  selectedReportType,
  showReportGuide,
  setShowReportGuide,
  setValue
}: ReportTypeSelectorProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');

  // Only show options after user has actually selected a category
  const showSnapshotSubCategories = selectedCategory === 'snapshot';
  const showEssenceOptions = selectedCategory === 'the-self' && selectedReportType === 'essence';
  const showRelationshipOptions = selectedCategory === 'compatibility' && (selectedReportType === 'sync' || selectedReportType === 'compatibility');
  
  const requiresReturnYear = selectedReportType === 'return';

  const getCurrentYear = () => new Date().getFullYear();

  return (
    <>
      <FormStep stepNumber={1} title="Choose Your Report Type" className="bg-background">
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setShowReportGuide(true)}
            className="text-foreground hover:text-primary font-bold underline mx-auto block"
          >
            Not sure which report to choose? Click here.
          </button>
          
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Main Category Selection */}
            <div className="space-y-4">
              <Controller
                control={control}
                name="reportCategory"
                render={({ field }) => (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {reportCategories.map((category) => {
                      const IconComponent = category.icon;
                      const isSelected = selectedCategory === category.value;
                      
                      return (
                        <motion.button
                          key={category.value}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(category.value);
                            field.onChange(category.value);
                            
                            // If not snapshot, set the report type directly
                            if (category.value !== 'snapshot' && setValue) {
                              setValue('reportType', category.reportType);
                            }
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
                              <h3 className="text-lg font-semibold text-gray-900">{category.title}</h3>
                              <p className="text-sm text-muted-foreground">{category.description}</p>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              />
            </div>

            {/* Snapshot Subcategory Selection - Only show after snapshot is selected */}
            {showSnapshotSubCategories && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-primary text-center">Choose your snapshot type</h3>
                <Controller
                  control={control}
                  name="reportSubCategory"
                  render={({ field }) => (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {snapshotSubCategories.map((subCategory) => {
                        const IconComponent = subCategory.icon;
                        const isSelected = selectedSubCategory === subCategory.value;
                        
                        return (
                          <motion.button
                            key={subCategory.value}
                            type="button"
                            onClick={() => {
                              setSelectedSubCategory(subCategory.value);
                              field.onChange(subCategory.value);
                              
                              // Set the specific report type
                              if (setValue) {
                                setValue('reportType', subCategory.reportType);
                              }
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
                                <h3 className="text-lg font-semibold text-gray-900">{subCategory.title}</h3>
                                <p className="text-sm text-muted-foreground">{subCategory.description}</p>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                />
              </div>
            )}

            {/* Essence Type Selection - Only show after the-self is selected */}
            {showEssenceOptions && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-primary text-center">Choose your report style *</h3>
                <Controller
                  control={control}
                  name="essenceType"
                  render={({ field }) => (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                      {essenceTypes.map((type) => {
                        const isSelected = field.value === type.value;
                        
                        return (
                          <motion.button
                            key={type.value}
                            type="button"
                            onClick={() => field.onChange(type.value)}
                            className={`w-full p-4 rounded-xl border transition-all duration-200 shadow-sm bg-white/60 backdrop-blur-sm hover:shadow-md active:scale-[0.98] ${
                              isSelected 
                                ? 'border-primary shadow-md bg-primary/5' 
                                : 'border-neutral-200 hover:border-neutral-300'
                            }`}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="text-center">
                              <h4 className="text-lg font-semibold text-gray-900">{type.label}</h4>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                />
                {errors.essenceType && (
                  <p className="text-sm text-destructive text-center">{errors.essenceType.message}</p>
                )}
              </div>
            )}

            {/* Return Year */}
            {requiresReturnYear && (
              <div className="space-y-2">
                <Label htmlFor="returnYear">Return Year *</Label>
                <Controller
                  control={control}
                  name="returnYear"
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="number"
                      placeholder={getCurrentYear().toString()}
                      min="1900"
                      max="2100"
                      className="h-12"
                    />
                  )}
                />
              </div>
            )}

            {/* Relationship Type Selection - Only show after compatibility is selected */}
            {showRelationshipOptions && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-primary text-center">Choose your report style *</h3>
                <Controller
                  control={control}
                  name="relationshipType"
                  render={({ field }) => (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                      {relationshipTypes.map((type) => {
                        const isSelected = field.value === type.value;
                        
                        return (
                          <motion.button
                            key={type.value}
                            type="button"
                            onClick={() => field.onChange(type.value)}
                            className={`w-full p-4 rounded-xl border transition-all duration-200 shadow-sm bg-white/60 backdrop-blur-sm hover:shadow-md active:scale-[0.98] ${
                              isSelected 
                                ? 'border-primary shadow-md bg-primary/5' 
                                : 'border-neutral-200 hover:border-neutral-300'
                            }`}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="text-center">
                              <h4 className="text-lg font-semibold text-gray-900">{type.label}</h4>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                />
                {errors.relationshipType && (
                  <p className="text-sm text-destructive text-center">{errors.relationshipType.message}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </FormStep>

      <ReportGuideModal 
        isOpen={showReportGuide} 
        onClose={() => setShowReportGuide(false)} 
      />
    </>
  );
};

export default ReportTypeSelector;
