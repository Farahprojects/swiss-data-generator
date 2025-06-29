
import React from 'react';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { reportTypes, relationshipTypes, essenceTypes } from '@/constants/report-types';
import { ReportFormData } from '@/types/public-report';
import FormStep from './FormStep';
import ReportGuideModal from './ReportGuideModal';
import { 
  Heart, 
  User, 
  Waves, 
  Brain, 
  Calendar, 
  Target 
} from 'lucide-react';

interface ReportTypeSelectorProps {
  control: Control<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  selectedReportType: string;
  showReportGuide: boolean;
  setShowReportGuide: (show: boolean) => void;
}

const reportTypeCards = [
  {
    value: 'sync',
    label: 'Compatibility Report',
    description: 'Understand relationship dynamics',
    icon: Heart,
    color: 'text-pink-500'
  },
  {
    value: 'essence',
    label: 'They Self Report',
    description: 'Deep dive into your personality',
    icon: User,
    color: 'text-blue-500'
  },
  {
    value: 'flow',
    label: 'Flow Report',
    description: 'Track your creative rhythms',
    icon: Waves,
    color: 'text-green-500'
  },
  {
    value: 'mindset',
    label: 'Mindset Report',
    description: 'Mental clarity insights',
    icon: Brain,
    color: 'text-purple-500'
  },
  {
    value: 'monthly',
    label: 'Energy Month Report',
    description: 'Monthly energy forecast',
    icon: Calendar,
    color: 'text-orange-500'
  },
  {
    value: 'focus',
    label: 'Focus Report',
    description: 'Optimize your productivity',
    icon: Target,
    color: 'text-teal-500'
  }
];

const ReportTypeSelector = ({ 
  control, 
  errors, 
  selectedReportType,
  showReportGuide,
  setShowReportGuide 
}: ReportTypeSelectorProps) => {
  const requiresEssenceType = selectedReportType === 'essence';
  const requiresReturnYear = selectedReportType === 'return';
  const requiresRelationshipType = selectedReportType === 'sync' || selectedReportType === 'compatibility';

  const getCurrentYear = () => new Date().getFullYear();

  return (
    <>
      <FormStep stepNumber={1} title="Choose Your Report Type" className="bg-background">
        <div className="space-y-8">
          <button
            type="button"
            onClick={() => setShowReportGuide(true)}
            className="text-foreground hover:text-primary font-bold underline mx-auto block"
          >
            Not sure which report to choose? Click here.
          </button>
          
          <div className="max-w-4xl mx-auto">
            <Controller
              control={control}
              name="reportType"
              render={({ field }) => (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportTypeCards.map((card) => {
                    const IconComponent = card.icon;
                    const isSelected = field.value === card.value;
                    
                    return (
                      <div
                        key={card.value}
                        onClick={() => field.onChange(card.value)}
                        className={`
                          relative p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                          ${isSelected 
                            ? 'border-primary bg-primary/5 shadow-md' 
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                          }
                        `}
                      >
                        <div className="flex items-start space-x-4">
                          <div className={`flex-shrink-0 ${card.color}`}>
                            <IconComponent className="w-8 h-8" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-lg font-semibold mb-2 ${isSelected ? 'text-primary' : 'text-gray-900'}`}>
                              {card.label}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {card.description}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="flex-shrink-0">
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            />
            {errors.reportType && (
              <p className="text-sm text-destructive mt-2 text-center">{errors.reportType.message}</p>
            )}
          </div>

          {/* Sub-options that appear inline when a report type is selected */}
          {selectedReportType && (
            <div className="max-w-2xl mx-auto space-y-6">
              {requiresEssenceType && (
                <div className="space-y-3 p-6 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-primary text-center">Choose your report style *</div>
                  <Controller
                    control={control}
                    name="essenceType"
                    render={({ field }) => (
                      <ToggleGroup
                        type="single"
                        value={field.value}
                        onValueChange={field.onChange}
                        className="justify-center flex-wrap gap-2"
                      >
                        {essenceTypes.map((type) => (
                          <ToggleGroupItem 
                            key={type.value} 
                            value={type.value}
                            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:bg-primary/10 hover:text-primary flex-shrink-0 text-sm px-4 py-2"
                          >
                            {type.label}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    )}
                  />
                  {errors.essenceType && (
                    <p className="text-sm text-destructive text-center">{errors.essenceType.message}</p>
                  )}
                </div>
              )}

              {requiresReturnYear && (
                <div className="space-y-3 p-6 bg-gray-50 rounded-lg">
                  <Label htmlFor="returnYear" className="text-lg font-semibold text-primary block text-center">Return Year *</Label>
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
                        className="h-12 max-w-xs mx-auto"
                      />
                    )}
                  />
                  {errors.returnYear && (
                    <p className="text-sm text-destructive text-center">{errors.returnYear.message}</p>
                  )}
                </div>
              )}

              {requiresRelationshipType && (
                <div className="space-y-3 p-6 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-primary text-center">Choose your report style *</div>
                  <Controller
                    control={control}
                    name="relationshipType"
                    render={({ field }) => (
                      <ToggleGroup
                        type="single"
                        value={field.value}
                        onValueChange={field.onChange}
                        className="justify-center flex-wrap gap-2"
                      >
                        {relationshipTypes.map((type) => (
                          <ToggleGroupItem 
                            key={type.value} 
                            value={type.value}
                            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:bg-primary/10 hover:text-primary flex-shrink-0 text-sm px-4 py-2"
                          >
                            {type.label}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    )}
                  />
                  {errors.relationshipType && (
                    <p className="text-sm text-destructive text-center">{errors.relationshipType.message}</p>
                  )}
                </div>
              )}
            </div>
          )}
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
