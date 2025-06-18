
import { useState, useEffect } from 'react';
import { validatePromoCode, PromoCodeValidation } from '@/utils/promoCodeValidation';

export const usePromoValidation = (promoCode: string) => {
  const [promoValidation, setPromoValidation] = useState<PromoCodeValidation | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  useEffect(() => {
    if (!promoCode || promoCode.trim() === '') {
      setPromoValidation(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsValidatingPromo(true);
      try {
        const validation = await validatePromoCode(promoCode);
        setPromoValidation(validation);
      } catch (error) {
        console.error('Error validating promo code:', error);
        setPromoValidation({
          isValid: false,
          discountPercent: 0,
          message: 'Error validating promo code',
          isFree: false
        });
      } finally {
        setIsValidatingPromo(false);
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [promoCode]);

  return { promoValidation, isValidatingPromo };
};
