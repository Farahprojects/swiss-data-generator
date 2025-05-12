
import { supabase } from "@/integrations/supabase/client";

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
    // Using generic type to avoid TypeScript errors with missing tables
    const { error } = await supabase
      .from('stripe_flow_tracking' as any)
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
    // Using generic type to avoid TypeScript errors with missing tables
    const { data, error } = await supabase
      .from('stripe_flow_tracking' as any)
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error getting flow tracking data:', error);
      throw error;
    }

    // If no data was found, return null
    if (!data || data.length === 0) {
      return null;
    }

    // Return the first (and only) result
    return data[0] as FlowRecord;
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
    // Using generic type to avoid TypeScript errors with missing tables
    const { data, error } = await supabase
      .from('stripe_flow_tracking' as any)
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) {
      // Check for the PGRST116 error code which means no rows were found
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error getting flow tracking data by session:', error);
      throw error;
    }

    // If no data was found, return null
    if (!data) {
      return null;
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
    // Using generic type to avoid TypeScript errors with missing tables
    const { error } = await supabase
      .from('stripe_flow_tracking' as any)
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
