
import { supabase } from '@/integrations/supabase/client';

export interface PromoCodeValidation {
  isValid: boolean;
  discountPercent: number;
  message: string;
  isFree: boolean;
}

export const validatePromoCode = async (code: string): Promise<PromoCodeValidation> => {
  if (!code || code.trim() === '') {
    return {
      isValid: false,
      discountPercent: 0,
      message: 'Please enter a promo code',
      isFree: false
    };
  }

  try {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return {
        isValid: false,
        discountPercent: 0,
        message: 'Invalid promo code',
        isFree: false
      };
    }

    // Check usage limits
    if (data.max_uses && data.times_used >= data.max_uses) {
      return {
        isValid: false,
        discountPercent: 0,
        message: 'This promo code has reached its usage limit',
        isFree: false
      };
    }

    const isFree = data.discount_percent === 100;
    
    return {
      isValid: true,
      discountPercent: data.discount_percent,
      message: isFree 
        ? 'Free report! No payment required.' 
        : `${data.discount_percent}% discount applied`,
      isFree
    };

  } catch (error) {
    console.error('Error validating promo code:', error);
    return {
      isValid: false,
      discountPercent: 0,
      message: 'Error validating promo code',
      isFree: false
    };
  }
};

export const createFreeReport = async (promoCode: string, reportData: any) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-free-report', {
      body: {
        promoCode: promoCode.trim().toUpperCase(),
        reportData
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to create free report');
    }

    return data;
  } catch (error) {
    console.error('Error creating free report:', error);
    throw error;
  }
};
