
import React from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ReportFormData, reportTypes, relationshipTypes, essenceTypes } from './types';

interface ReportTypeSelectionStepProps {
  form: UseFormReturn<ReportFormData>;
  selectedReportType: string;
  onShowReportGuide: () => void;
}

const ReportTypeSelectionStep = ({ form, selectedReportType, onShowReportGuide }: ReportTypeSelectionStepProps) => {
  const { register, control, formState: { errors } } = form;

  const requiresSecondPerson = selectedReportType === 'sync' || selectedReportType === 'compatibility';
  const requiresRelationshipType = requiresSecondPerson;
  const requiresEssenceType = selectedReportType === 'essence';
  const requiresReturnYear = selectedReportType === 'return';

  const getCurrentYear = () => new Date().getFullYear();

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onShowReportGuide}
        className="text-foreground hover:text-primary font-bold underline"
      >
        Not sure which report to choose? Click here.
      </button>
      
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold flex-shrink-0">1</div>
          <h2 className="text-2xl font-semibold">Choose Your Report Type</h2>
        </div>
        
        <div className="pl-1 md:pl-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reportType">Report Type *</Label>
            <Controller
              control={control}
              name="reportType"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
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

          {/* Conditional Fields for Report Options */}
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
                    className="justify-start flex-wrap gap-1 md:gap-2"
                  >
                    {essenceTypes.map((type) => (
                      <ToggleGroupItem 
                        key={type.value} 
                        value={type.value}
                        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:bg-primary/10 hover:text-primary flex-shrink-0 text-xs md:text-sm px-2 md:px-4 py-2"
                      >
                        {type.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                )}
              />
            </div>
          )}

          {requiresReturnYear && (
            <div className="space-y-2">
              <Label htmlFor="returnYear">Return Year *</Label>
              <Input
                {...register('returnYear')}
                type="number"
                placeholder={getCurrentYear().toString()}
                min="1900"
                max="2100"
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
                    className="justify-start flex-wrap gap-1 md:gap-2"
                  >
                    {relationshipTypes.map((type) => (
                      <ToggleGroupItem 
                        key={type.value} 
                        value={type.value}
                        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:bg-primary/10 hover:text-primary flex-shrink-0 text-xs md:text-sm px-2 md:px-4 py-2"
                      >
                        {type.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                )}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportTypeSelectionStep;
