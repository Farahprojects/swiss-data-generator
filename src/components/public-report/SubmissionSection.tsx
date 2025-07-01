
import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ReportFormData } from '@/types/public-report';
import FormStep from './FormStep';
import PromoCodeSection from './PromoCodeSection';
import OrderSummary from './OrderSummary';

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
  return (
    <FormStep stepNumber={3} title="Additional Notes & Payment" className="bg-background">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Additional Notes Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes or Questions (Optional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Share any specific areas you'd like us to focus on in your report..."
              className="min-h-[100px] resize-none"
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>
        </div>

        {/* Promo Code Section */}
        <PromoCodeSection register={register} errors={errors} />

        {/* Order Summary */}
        <OrderSummary promoValidation={promoValidation} />

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="button"
            onClick={onButtonClick}
            disabled={isProcessing || isPricingLoading}
            className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-white"
            size="lg"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </div>
            ) : isPricingLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Loading...
              </div>
            ) : (
              'Generate My Report'
            )}
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Secure checkout powered by Stripe</p>
          <p className="mt-1">Your report will be delivered to your email within minutes</p>
        </div>
      </div>
    </FormStep>
  );
};

export default SubmissionSection;
