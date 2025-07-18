import { supabase } from '@/integrations/supabase/client';
import { storeGuestReportId } from '@/utils/urlHelpers';

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
    // Use maybeSingle() instead of single() to handle non-existent codes gracefully
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Database error validating promo code:', error);
      return {
        isValid: false,
        discountPercent: 0,
        message: 'Unable to validate promo code. Please check your connection and try again.',
        isFree: false,
        errorType: 'network_error'
      };
    }

    if (!data) {
      return {
        isValid: false,
        discountPercent: 0,
        message: 'This promo code is not valid. Please check the spelling and try again.',
        isFree: false,
        errorType: 'invalid'
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
    /* 1 — validate promo code */
    const { data: promo, error: promoErr } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode.trim().toUpperCase())
      .eq('is_active', true)
      .single();

    if (promoErr || !promo || promo.discount_percent !== 100)
      throw new Error('Invalid or non‑free promo code');

    if (promo.max_uses && promo.times_used >= promo.max_uses)
      throw new Error('Promo code usage limit exceeded');

    /* 2 — insert guest report WITHOUT auto‑select */
    const sessionId = `free_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const payload = {
      stripe_session_id: sessionId,
      email:            reportData.email,
      report_type:      reportData.reportType,
      report_data:      reportData,
      amount_paid:      0,
      payment_status:   'paid',
      promo_code_used:  promoCode,
      has_report:       false,
      email_sent:       false,
      // Ensure these are null, not empty strings or invalid values
      coach_id:         null,
      translator_log_id: null,
      report_log_id:    null
    };

    console.log('payload being inserted:', payload);

    const { data: insertedIds, error: insertErr } = await supabase
      .from('guest_reports')
      .insert(payload);

    if (insertErr) throw insertErr;

    /* 3 — fetch the new row safely (uuid‑to‑uuid) */
    const { data: guest, error: fetchErr } = await supabase
      .from('guest_reports')
      .select('id')
      .eq('stripe_session_id', sessionId)  // text‑to‑text comparison
      .single();

    if (fetchErr || !guest) throw new Error('Could not retrieve new report id');

    /* 4 — store id for downstream flow */
    storeGuestReportId(guest.id);

    /* 5 — increment promo usage (fire‑and‑forget) */
    supabase
      .from('promo_codes')
      .update({ times_used: promo.times_used + 1 })
      .eq('id', promo.id);

    /* 6 — kick off Swiss / AI flow */
    const { error: verifyErr } = await supabase.functions.invoke(
      'verify-guest-payment',
      { body: { sessionId } }
    );
    if (verifyErr) throw verifyErr;

    return {
      success:   true,
      message:   'Free report created successfully',
      reportId:  guest.id,
      sessionId: sessionId
    };
  } catch (err) {
    console.error('Error creating free report:', err);
    throw err;
  }
};
