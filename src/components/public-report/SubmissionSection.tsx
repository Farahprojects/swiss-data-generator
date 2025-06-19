
import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import FormStep from './FormStep';
import PromoCodeSection from './PromoCodeSection';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { ReportFormData } from '@/types/public-report';

interface PromoValidationState {
  status: 'none' | 'validating' | 'valid-free' | 'valid-discount' | 'invalid';
  message: string;
  discountPercent: number;
}

interface SubmissionSectionProps {
  register: UseFormRegister<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  isProcessing: boolean;
  isPricingLoading: boolean;
  promoValidation: PromoValidationState;
  onButtonClick: (e: React.MouseEvent) => void;
}

const SubmissionSection = ({ 
  register,
  errors,
  isProcessing, 
  isPricingLoading,
  promoValidation,
  onButtonClick 
}: SubmissionSectionProps) => {
  // Check if there are any validation errors
  const hasErrors = Object.keys(errors).length > 0;
  
  // Debug: log current errors
  React.useEffect(() => {
    if (hasErrors) {
      console.log('🚨 Form validation errors:', errors);
    }
  }, [hasErrors, errors]);

  return (
    <FormStep stepNumber={4} title="Ready to Generate Your Report?" className="bg-background">
      <div className="space-y-8 text-center">
        {/* Show validation errors if any */}
        {hasErrors && (
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix the following errors before submitting:
              <ul className="list-disc list-inside mt-2 text-left">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field} className="text-sm">
                    <strong>{field}:</strong> {error?.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Button 
          type="button"
          size="lg" 
          className="px-12 py-6 text-lg relative z-10"
          disabled={isProcessing || isPricingLoading || hasErrors}
          onClick={onButtonClick}
          style={{ pointerEvents: 'auto' }}
        >
          {isProcessing || isPricingLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : hasErrors ? (
            'Fix Errors Above'
          ) : (
            'Generate my Report'
          )}
        </Button>
        
        <PromoCodeSection
          register={register}
          promoValidation={promoValidation}
        />
      </div>
    </FormStep>
  );
};

export default SubmissionSection;
