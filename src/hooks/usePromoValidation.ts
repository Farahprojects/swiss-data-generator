
import { useState } from 'react';

export interface PromoCodeValidation {
  isValid: boolean;
  discountPercent: number;
  message: string;
  isFree: boolean;
  errorType?: string;
}

export const usePromoValidation = () => {
  const [promoValidation, setPromoValidation] = useState<PromoCodeValidation | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  const validatePromoManually = async (promoCode: string) => {
    if (!promoCode || promoCode.trim() === '') {
      setPromoValidation(null);
      return null;
    }

    setIsValidatingPromo(true);
    try {
      // Note: Promo validation is now handled server-side in initiate-report-flow
      // This function is kept for UI state management but actual validation
      // happens when the report is submitted
      const validation = {
        isValid: true, // Assume valid for UI purposes
        discountPercent: 0, // Will be determined server-side
        message: 'Promo code will be validated when submitting',
        isFree: false // Will be determined server-side
      };
      setPromoValidation(validation);
      return validation;
    } catch (error) {
      console.error('Error validating promo code:', error);
      const errorValidation = {
        isValid: false,
        discountPercent: 0,
        message: 'Error validating promo code',
        isFree: false
      };
      setPromoValidation(errorValidation);
      return errorValidation;
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const resetValidation = () => {
    setPromoValidation(null);
    setIsValidatingPromo(false);
  };

  return { 
    promoValidation, 
    isValidatingPromo, 
    validatePromoManually, 
    resetValidation 
  };
};
