
import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import FormStep from './FormStep';
import PromoCodeSection from './PromoCodeSection';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { ReportFormData } from '@/types/public-report';
import { PromoCodeValidation } from '@/utils/promoCodeValidation';

interface SubmissionSectionProps {
  register: UseFormRegister<ReportFormData>;
  errors: FieldErrors<ReportFormData>;
  isProcessing: boolean;
  isPricingLoading: boolean;
  promoValidation: PromoCodeValidation | null;
  isValidatingPromo: boolean;
  onPromoCodeChange: (value: string) => void;
  onButtonClick: (e: React.MouseEvent) => void;
}

const SubmissionSection = ({ 
  register,
  errors,
  isProcessing, 
  isPricingLoading,
  promoValidation,
  isValidatingPromo,
  onPromoCodeChange,
  onButtonClick 
}: SubmissionSectionProps) => {
  // Check if there are any validation errors
  const hasErrors = Object.keys(errors).length > 0;
  
  // Determine if we should disable the button
  const shouldDisableButton = isProcessing || isPricingLoading || hasErrors || isValidatingPromo;
  
  // Determine button text based on state
  const getButtonText = () => {
    if (isProcessing || isPricingLoading) {
      return 'Processing...';
    }
    
    if (hasErrors) {
      return 'Fix Errors Above';
    }
    
    if (isValidatingPromo) {
      return 'Validating promo code...';
    }
    
    if (promoValidation?.isValid) {
      if (promoValidation.isFree) {
        return 'Generate Free Report';
      } else {
        return `Apply ${promoValidation.discountPercent}% Discount & Continue`;
      }
    }
    
    return 'Enter';
  };
  
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
          disabled={shouldDisableButton}
          onClick={onButtonClick}
          style={{ pointerEvents: 'auto' }}
        >
          {(isProcessing || isPricingLoading) ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : isValidatingPromo ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validating promo code...
            </>
          ) : (
            getButtonText()
          )}
        </Button>
        
        <PromoCodeSection
          register={register}
          promoValidation={promoValidation}
          isValidatingPromo={isValidatingPromo}
          onPromoCodeChange={onPromoCodeChange}
        />
      </div>
    </FormStep>
  );
};

export default SubmissionSection;
