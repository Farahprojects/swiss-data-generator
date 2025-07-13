import { ReportFormData } from '@/types/public-report';

interface PaymentSubmissionParams {
  promoCode: string;
  validatePromoManually: (code: string) => Promise<any>;
  onSubmit: () => void;
  setIsLocalProcessing?: (processing: boolean) => void;
}

/**
 * Shared payment submission logic for both desktop and mobile flows
 * This ensures identical behavior for promo validation, UX delays, and submission
 */
export const handlePaymentSubmission = async ({
  promoCode,
  validatePromoManually,
  onSubmit,
  setIsLocalProcessing
}: PaymentSubmissionParams) => {
  // Show processing immediately
  if (setIsLocalProcessing) {
    setIsLocalProcessing(true);
  }
  
  // First validate promo code if present
  if (promoCode && promoCode.trim() !== '') {
    const validation = await validatePromoManually(promoCode);
    
    // Give user time to see the validation result
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Then proceed with form submission
  onSubmit();
};