
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

// Flow state types
export type FlowState = 'checkout_created' | 'payment_verified' | 'account_created' | 'account_linked';

// Interface for a flow record
export interface FlowRecord {
  id?: string;
  session_id: string;
  user_id?: string;
  email?: string;
  flow_state: FlowState;
  plan_type?: string;
  add_ons?: Record<string, boolean>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Creates a new flow tracking record or updates an existing one
 * @param flowData The flow data to save
 * @returns True if successful, throws an error otherwise
 */
export const saveFlowTracking = async (flowData: FlowRecord): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('stripe_flow_tracking')
      .upsert(
        {
          session_id: flowData.session_id,
          user_id: flowData.user_id,
          email: flowData.email,
          flow_state: flowData.flow_state,
          plan_type: flowData.plan_type,
          add_ons: flowData.add_ons,
          updated_at: new Date().toISOString()
        },
        { 
          onConflict: 'session_id'
        }
      );

    if (error) {
      console.error('Error saving flow tracking data:', error);
      throw error;
    }

    console.log(`Flow state "${flowData.flow_state}" saved successfully for session ${flowData.session_id}`);
    return true;
  } catch (error) {
    console.error('Failed to save flow tracking data:', error);
    throw error;
  }
};

/**
 * Gets the latest flow tracking record for a user by email
 * @param email The user's email
 * @returns The latest flow tracking record or null if not found
 */
export const getLatestFlowByEmail = async (email: string): Promise<FlowRecord | null> => {
  try {
    const { data, error } = await supabase
      .from('stripe_flow_tracking')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is the "no rows returned" error, which we handle by returning null
      console.error('Error getting flow tracking data:', error);
      throw error;
    }

    return data as FlowRecord;
  } catch (error) {
    console.error('Failed to get flow tracking data:', error);
    throw error;
  }
};

/**
 * Gets all flow tracking records for a session ID
 * @param sessionId The session ID to lookup
 * @returns The flow tracking record or null if not found
 */
export const getFlowBySessionId = async (sessionId: string): Promise<FlowRecord | null> => {
  try {
    const { data, error } = await supabase
      .from('stripe_flow_tracking')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting flow tracking data by session:', error);
      throw error;
    }

    return data as FlowRecord;
  } catch (error) {
    console.error('Failed to get flow tracking data by session:', error);
    throw error;
  }
};

/**
 * Links a user to a flow tracking record by session ID
 * @param sessionId The session ID to update
 * @param userId The user ID to link
 * @returns True if successful, throws an error otherwise
 */
export const linkUserToFlow = async (sessionId: string, userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('stripe_flow_tracking')
      .update({
        user_id: userId,
        flow_state: 'account_linked' as FlowState,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error linking user to flow:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to link user to flow:', error);
    throw error;
  }
};
