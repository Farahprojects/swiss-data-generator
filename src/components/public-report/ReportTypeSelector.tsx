
import React, { useRef, useEffect } from 'react';
import { Control, Controller, FieldErrors, UseFormTrigger } from 'react-hook-form';
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
  trigger: UseFormTrigger<ReportFormData>;
  watch: (field?: string) => any;
}

const ReportTypeSelector = ({ 
  control, 
  errors, 
  selectedReportType,
  showReportGuide,
  setShowReportGuide,
  trigger,
  watch
}: ReportTypeSelectorProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const requiresEssenceType = selectedReportType === 'essence';
  const requiresReturnYear = selectedReportType === 'return';
  const requiresRelationshipType = selectedReportType === 'sync' || selectedReportType === 'compatibility';

  const essenceType = watch('essenceType');
  const relationshipType = watch('relationshipType');

  const getCurrentYear = () => new Date().getFullYear();

  // Intersection Observer to detect when section is leaving viewport
  useEffect(() => {
    if (!sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // When section is leaving viewport (intersectionRatio is decreasing and below threshold)
        if (entry.intersectionRatio < 0.5 && !entry.isIntersecting) {
          // Validate required fields based on selected report type
          if (requiresEssenceType && (!essenceType || essenceType === '')) {
            trigger('essenceType');
          }
          if (requiresRelationshipType && (!relationshipType || relationshipType === '')) {
            trigger('relationshipType');
          }
        }
      },
      {
        threshold: [0.5],
        rootMargin: '-50px 0px -50px 0px'
      }
    );

    observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, [requiresEssenceType, requiresRelationshipType, essenceType, relationshipType, trigger]);

  // Also trigger validation on scroll events for more immediate feedback
  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      
      const rect = sectionRef.current.getBoundingClientRect();
      const isLeavingViewport = rect.bottom < window.innerHeight * 0.6;
      
      if (isLeavingViewport) {
        if (requiresEssenceType && (!essenceType || essenceType === '')) {
          trigger('essenceType');
        }
        if (requiresRelationshipType && (!relationshipType || relationshipType === '')) {
          trigger('relationshipType');
        }
      }
    };

    const throttledScroll = throttle(handleScroll, 100);
    window.addEventListener('scroll', throttledScroll, { passive: true });
    
    return () => window.removeEventListener('scroll', throttledScroll);
  }, [requiresEssenceType, requiresRelationshipType, essenceType, relationshipType, trigger]);

  // Simple throttle function
  function throttle(func: Function, limit: number) {
    let inThrottle: boolean;
    return function(this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }

  return (
    <>
      <FormStep stepNumber={1} title="Choose Your Report Type" className="bg-background">
        <div ref={sectionRef} className="space-y-6">
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
                      className={`justify-center flex-wrap gap-2 transition-all duration-200 ${
                        errors.essenceType 
                          ? 'ring-2 ring-destructive ring-offset-2 bg-destructive/5 rounded-lg p-2' 
                          : ''
                      }`}
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
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ Please select an essence focus before continuing
                    </p>
                  </div>
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
                      className={`justify-center flex-wrap gap-2 transition-all duration-200 ${
                        errors.relationshipType 
                          ? 'ring-2 ring-destructive ring-offset-2 bg-destructive/5 rounded-lg p-2' 
                          : ''
                      }`}
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
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ Please select a relationship type before continuing
                    </p>
                  </div>
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
