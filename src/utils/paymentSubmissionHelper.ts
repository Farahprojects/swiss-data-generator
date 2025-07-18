
import { ReportFormData } from '@/types/public-report';

interface PaymentSubmissionParams {
  promoCode: string;
  promoValidation: any; // Use cached validation instead of re-validating
  onSubmit: () => void;
  onFreeSubmit?: () => void; // New handler for free orders
  setIsLocalProcessing?: (processing: boolean) => void;
  clearPromoCode?: () => void;
  finalPrice?: number; // Pass calculated price
}

/**
 * Optimized payment submission logic - no delays, no double validation
 * Uses cached promo validation and skips Stripe for 100% free orders
 */
export const handlePaymentSubmission = async ({
  promoCode,
  promoValidation,
  onSubmit,
  onFreeSubmit,
  setIsLocalProcessing,
  clearPromoCode,
  finalPrice = 0
}: PaymentSubmissionParams) => {
  // Show processing immediately
  if (setIsLocalProcessing) {
    setIsLocalProcessing(true);
  }
  
  // Check if promo code validation failed (using cached validation)
  if (promoCode && promoCode.trim() !== '' && !promoValidation?.isValid) {
    // Reset processing state and clear invalid promo
    if (setIsLocalProcessing) {
      setIsLocalProcessing(false);
    }
    if (clearPromoCode) {
      clearPromoCode();
    }
    return; // Don't proceed with submission
  }
  
  // Handle 100% free orders (skip Stripe entirely)
  if (finalPrice === 0 || (promoValidation?.isFree && promoValidation?.isValid)) {
    if (onFreeSubmit) {
      onFreeSubmit(); // Handle free order directly
    } else {
      onSubmit(); // Fallback to regular submission
    }
    return;
  }
  
  // For paid orders, proceed with regular submission (Stripe)
  onSubmit();
};
