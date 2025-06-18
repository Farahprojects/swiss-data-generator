
import React from 'react';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { reportTypes, relationshipTypes, essenceTypes } from '@/constants/report-types';
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
  const requiresEssenceType = selectedReportType === 'essence';
  const requiresReturnYear = selectedReportType === 'return';
  const requiresRelationshipType = selectedReportType === 'sync' || selectedReportType === 'compatibility';

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
                      {reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
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

            {requiresEssenceType && (
              <div className="space-y-2">
                <Label htmlFor="essenceType">Essence Focus *</Label>
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
                  <p className="text-sm text-destructive">{errors.essenceType.message}</p>
                )}
              </div>
            )}

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

            {requiresRelationshipType && (
              <div className="space-y-2">
                <Label htmlFor="relationshipType">Relationship Type *</Label>
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
                  <p className="text-sm text-destructive">{errors.relationshipType.message}</p>
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
