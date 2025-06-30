
import { useState } from 'react';
import { validatePromoCode, PromoCodeValidation } from '@/utils/promoCodeValidation';

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
      const validation = await validatePromoCode(promoCode);
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
