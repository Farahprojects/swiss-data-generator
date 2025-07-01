import { supabase } from '@/integrations/supabase/client';

export interface PromoCodeValidation {
  isValid: boolean;
  discountPercent: number;
  message: string;
  isFree: boolean;
  errorType?: 'invalid' | 'expired' | 'usage_limit' | 'network_error' | 'empty';
}

export const validatePromoCode = async (code: string): Promise<PromoCodeValidation> => {
  if (!code || code.trim() === '') {
    return {
      isValid: false,
      discountPercent: 0,
      message: 'Please enter a promo code',
      isFree: false,
      errorType: 'empty'
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
        message: 'This promo code is not valid. Please check the spelling and try again.',
        isFree: false,
        errorType: 'invalid'
      };
    }

    // Check if expired (only if expires_at field exists)
    if ('expires_at' in data && data.expires_at && new Date(data.expires_at) < new Date()) {
      return {
        isValid: false,
        discountPercent: 0,
        message: 'This promo code has expired and is no longer valid.',
        isFree: false,
        errorType: 'expired'
      };
    }

    // Check usage limits
    if (data.max_uses && data.times_used >= data.max_uses) {
      return {
        isValid: false,
        discountPercent: 0,
        message: 'This promo code has reached its usage limit and is no longer available.',
        isFree: false,
        errorType: 'usage_limit'
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
      message: 'Unable to validate promo code. Please check your connection and try again.',
      isFree: false,
      errorType: 'network_error'
    };
  }
};

export const createFreeReport = async (promoCode: string, reportData: any) => {
  try {
    // Validate promo code first
    const { data: promoCodeData, error: promoError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode.trim().toUpperCase())
      .eq('is_active', true)
      .single();

    if (promoError || !promoCodeData) {
      throw new Error('Invalid promo code');
    }

    // Check if promo code is 100% discount
    if (promoCodeData.discount_percent !== 100) {
      throw new Error('Promo code does not provide free access');
    }

    // Check usage limits
    if (promoCodeData.max_uses && promoCodeData.times_used >= promoCodeData.max_uses) {
      throw new Error('Promo code usage limit exceeded');
    }

    // Generate a unique session ID for tracking
    const sessionId = `free_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create guest report entry
    const { data: guestReport, error: reportError } = await supabase
      .from('guest_reports')
      .insert({
        stripe_session_id: sessionId,
        email: reportData.email,
        report_type: reportData.reportType,
        report_data: reportData,
        amount_paid: 0,
        payment_status: 'free',
        promo_code_used: promoCode,
        has_report: false,
        email_sent: false
      })
      .select()
      .single();

    if (reportError) {
      console.error('❌ Error creating guest report:', reportError);
      throw new Error('Failed to create report entry');
    }

    console.log('✅ Guest report created:', guestReport.id);

    // Update promo code usage count
    const { error: updateError } = await supabase
      .from('promo_codes')
      .update({ times_used: promoCodeData.times_used + 1 })
      .eq('id', promoCodeData.id);

    if (updateError) {
      console.error('⚠️ Warning: Failed to update promo code usage count:', updateError);
    }

    // Now call verify-guest-payment to get Swiss data
    const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-guest-payment', {
      body: { sessionId: sessionId }
    });

    if (verifyError) {
      console.error('❌ Error verifying free session:', verifyError);
      throw new Error('Failed to process free report');
    }

    console.log('✅ Free report processed successfully');

    return {
      success: true,
      message: 'Free report created successfully',
      reportId: guestReport.id,
      sessionId: sessionId,
      verifyResult: verifyResult
    };

  } catch (error) {
    console.error('Error creating free report:', error);
    throw error;
  }
};
