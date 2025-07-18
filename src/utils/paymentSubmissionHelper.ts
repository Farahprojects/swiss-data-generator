
interface PaymentSubmissionParams {
  promoCode: string;
  promoValidation: any;
  onSubmit: () => void;
  finalPrice: number;
  setIsLocalProcessing: (processing: boolean) => void;
  clearPromoCode?: () => void;
  onFreeSubmit?: () => void;
}

export const handlePaymentSubmission = async ({
  promoCode,
  promoValidation,
  onSubmit,
  finalPrice,
  setIsLocalProcessing,
  clearPromoCode,
  onFreeSubmit
}: PaymentSubmissionParams) => {
  console.log('Starting payment submission', { promoCode, finalPrice, promoValidation });
  
  // Set processing state
  if (setIsLocalProcessing) {
    setIsLocalProcessing(true);
  }
  
  // Check if promo code validation failed
  if (promoCode && promoCode.trim() !== '' && !promoValidation?.isValid) {
    console.log('Invalid promo code detected, stopping submission');
    if (setIsLocalProcessing) {
      setIsLocalProcessing(false);
    }
    return;
  }
  
  // Handle 100% free orders (skip Stripe entirely)
  if (finalPrice === 0 || (promoValidation?.isFree && promoValidation?.isValid)) {
    console.log('Processing free order');
    if (onFreeSubmit) {
      onFreeSubmit();
    } else {
      onSubmit();
    }
    return;
  }
  
  // For paid orders, proceed with regular submission (Stripe)
  console.log('Processing paid order');
  onSubmit();
};
