import React from 'react';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { reportTypes, parseReportType } from '@/constants/report-types';
import { ReportFormData } from '@/types/public-report';
import FormStep from './FormStep';
import ReportGuideModal from './ReportGuideModal';

interface ReportTypeSelectorProps {
  control: Control<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  selectedReportType: string;
  showReportGuide: boolean;
  setShowReportGuide: (show: boolean) => void;
}

const ReportTypeSelector = ({ 
  control, 
  errors, 
  selectedReportType,
  showReportGuide,
  setShowReportGuide 
}: ReportTypeSelectorProps) => {
  const { mainType } = parseReportType(selectedReportType);
  const requiresReturnYear = mainType === 'return';

  const getCurrentYear = () => new Date().getFullYear();

  const reportDescriptions = {
    'essence-relational': 'How you connect, respond, and engage in relationships.',
    'essence-personal': 'A direct read on your inner state, traits, and tendencies.',
    'essence-professional': 'How you operate, lead, and adapt in work environments.',
    'sync-professional': 'How you and another person align in a professional or team setting.',
    'sync-personal': 'How your energy interacts with anyone romantic, social, or casual.',
  };

  return (
    <>
      <FormStep stepNumber={1} title="Choose Your Report Type" className="bg-background">
        <div className="space-y-6">
          <button
            type="button"
            onClick={() => setShowReportGuide(true)}
            className="text-primary hover:text-primary-hover text-lg font-bold mx-auto block transition-colors"
          >
            Not sure which report to choose? Click here.
          </button>
          
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type *</Label>
              <Controller
                control={control}
                name="reportType"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select a report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((reportType) => (
                        <SelectItem key={reportType.value} value={reportType.value}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{reportType.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {reportDescriptions[reportType.value as keyof typeof reportDescriptions]}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.reportType && (
                <p className="text-sm text-destructive">{errors.reportType.message}</p>
              )}
            </div>

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
