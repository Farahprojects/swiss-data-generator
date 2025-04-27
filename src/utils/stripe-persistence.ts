
import { supabase } from "@/integrations/supabase/client";

interface StripeUserData {
  email: string;
  stripe_customer_id: string;
  stripe_subscription_id?: string;
  plan_name?: 'Starter' | 'Growth' | 'Professional';
  addon_relationship_compatibility?: boolean;
  addon_yearly_cycle?: boolean;
  addon_transit_12_months?: boolean;
  payment_status?: string;
  subscription_current_period_end?: string;
  stripe_invoice_id?: string;
  full_name?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  payment_method_type?: string;
  card_last4?: string;
  card_brand?: string;
}

export const saveStripeUserData = async (stripeData: StripeUserData) => {
  try {
    // Insert into stripe_users table first
    const { error: stripeError } = await supabase
      .from('stripe_users')
      .upsert({
        email: stripeData.email,
        stripe_customer_id: stripeData.stripe_customer_id,
        stripe_subscription_id: stripeData.stripe_subscription_id,
        plan_name: stripeData.plan_name || 'Starter',
        addon_relationship_compatibility: stripeData.addon_relationship_compatibility || false,
        addon_yearly_cycle: stripeData.addon_yearly_cycle || false,
        addon_transit_12_months: stripeData.addon_transit_12_months || false,
        payment_status: stripeData.payment_status,
        subscription_current_period_end: stripeData.subscription_current_period_end,
        stripe_invoice_id: stripeData.stripe_invoice_id,
        full_name: stripeData.full_name,
        billing_address_line1: stripeData.billing_address_line1,
        billing_address_line2: stripeData.billing_address_line2,
        city: stripeData.city,
        state: stripeData.state,
        postal_code: stripeData.postal_code,
        country: stripeData.country,
        phone: stripeData.phone,
        payment_method_type: stripeData.payment_method_type,
        card_last4: stripeData.card_last4,
        card_brand: stripeData.card_brand,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'stripe_customer_id'
      });

    if (stripeError) {
      console.error('Error saving stripe user data:', stripeError);
      throw stripeError;
    }

    return true;
  } catch (error) {
    console.error('Failed to save stripe user data:', error);
    throw error;
  }
};
