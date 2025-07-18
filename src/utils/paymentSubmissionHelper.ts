import { ReportFormData } from '@/types/public-report';

interface PaymentSubmissionParams {
  promoCode: string;
  validatePromoManually: (code: string) => Promise<any>;
  onSubmit: () => void;
  setIsLocalProcessing?: (processing: boolean) => void;
  clearPromoCode?: () => void;
}

/**
 * Shared payment submission logic for both desktop and mobile flows
 * This ensures identical behavior for promo validation, UX delays, and submission
 */
export const handlePaymentSubmission = async ({
  promoCode,
  validatePromoManually,
  onSubmit,
  setIsLocalProcessing,
  clearPromoCode
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
    
    // If validation failed, reset processing state and clear promo
    if (!validation?.isValid) {
      if (setIsLocalProcessing) {
        setIsLocalProcessing(false);
      }
      if (clearPromoCode) {
        clearPromoCode();
      }
      return; // Don't proceed with submission
    }
  }
  
  // Then proceed with form submission
  onSubmit();
};