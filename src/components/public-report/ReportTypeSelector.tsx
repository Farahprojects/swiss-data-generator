
import React from 'react';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
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
                      <SelectGroup>
                        <SelectLabel>Essence Report</SelectLabel>
                        <SelectItem value="essence-personal">Personal</SelectItem>
                        <SelectItem value="essence-professional">Professional</SelectItem>
                        <SelectItem value="essence-relational">Relational</SelectItem>
                      </SelectGroup>
                      
                      <SelectGroup>
                        <SelectLabel>Sync Report</SelectLabel>
                        <SelectItem value="sync-personal">Personal</SelectItem>
                        <SelectItem value="sync-professional">Professional</SelectItem>
                      </SelectGroup>
                      
                      <SelectGroup>
                        <SelectLabel>Other Reports</SelectLabel>
                        <SelectItem value="flow">Flow Report</SelectItem>
                        <SelectItem value="mindset">Mindset Report</SelectItem>
                        <SelectItem value="monthly">Monthly Report</SelectItem>
                        <SelectItem value="focus">Focus Report</SelectItem>
                      </SelectGroup>
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
