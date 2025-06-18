
import React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FormStep from './FormStep';
import PromoCodeSection from './PromoCodeSection';
import { UseFormRegister } from 'react-hook-form';
import { ReportFormData } from '@/types/public-report';
import { PromoCodeValidation } from '@/utils/promoCodeValidation';

interface SubmissionSectionProps {
  register: UseFormRegister<ReportFormData>;
  isProcessing: boolean;
  isPricingLoading: boolean;
  showPromoCode: boolean;
  setShowPromoCode: (show: boolean) => void;
  promoValidation: PromoCodeValidation | null;
  isValidatingPromo: boolean;
  onPromoCodeChange: (value: string) => void;
  onButtonClick: (e: React.MouseEvent) => void;
}

const SubmissionSection = ({ 
  register,
  isProcessing, 
  isPricingLoading,
  showPromoCode,
  setShowPromoCode,
  promoValidation,
  isValidatingPromo,
  onPromoCodeChange,
  onButtonClick 
}: SubmissionSectionProps) => {
  return (
    <FormStep stepNumber={0} title="Ready to Generate Your Report?" className="bg-background">
      <div className="space-y-8 text-center">
        <Button 
          type="button"
          size="lg" 
          className="px-12 py-6 text-lg relative z-10"
          disabled={isProcessing || isPricingLoading}
          onClick={onButtonClick}
          style={{ pointerEvents: 'auto' }}
        >
          {isProcessing || isPricingLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Enter'
          )}
        </Button>
        
        <PromoCodeSection
          register={register}
          showPromoCode={showPromoCode}
          setShowPromoCode={setShowPromoCode}
          promoValidation={promoValidation}
          isValidatingPromo={isValidatingPromo}
          onPromoCodeChange={onPromoCodeChange}
        />
      </div>
    </FormStep>
  );
};

export default SubmissionSection;
