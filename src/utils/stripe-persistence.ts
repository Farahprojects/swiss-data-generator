
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
    // Insert into app_users table
    const { data, error } = await supabase
      .from('app_users')
      .upsert({
        email: stripeData.email,
        stripe_customer_id: stripeData.stripe_customer_id,
        plan_name: stripeData.plan_name || 'Starter',
        addon_relationship_compatibility: stripeData.addon_relationship_compatibility || false,
        addon_yearly_cycle: stripeData.addon_yearly_cycle || false,
        addon_transit_12_months: stripeData.addon_transit_12_months || false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'stripe_customer_id'
      });

    if (error) {
      console.error('Error saving stripe user data:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to save stripe user data:', error);
    throw error;
  }
};
