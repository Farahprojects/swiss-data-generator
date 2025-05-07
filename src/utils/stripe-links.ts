
import { supabase } from "@/integrations/supabase/client";

export interface StripeLink {
  id: string;
  name: string;
  description: string | null;
  url: string;
  is_active: boolean;
  environment: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches a Stripe checkout link from the database by name
 * @param name The name identifier of the link
 * @returns The Stripe link object or null if not found
 */
export const getStripeLinkByName = async (name: string): Promise<StripeLink | null> => {
  try {
    console.log(`Fetching Stripe link with name: ${name}`);
    
    const { data, error } = await supabase
      .from('stripe_links')
      .select('*')
      .eq('is_active', true)
      .eq('name', name)
      .maybeSingle();
    
    if (error) {
      console.error(`Error fetching Stripe link with name ${name}:`, error);
      return null;
    }
    
    console.log(`Found Stripe link for ${name}:`, data);
    return data;
  } catch (err) {
    console.error(`Failed to fetch Stripe link with name ${name}:`, err);
    return null;
  }
};

/**
 * Fetches all active Stripe links from the database
 * @returns Array of Stripe link objects
 */
export const getAllStripeLinks = async (): Promise<StripeLink[]> => {
  try {
    const { data, error } = await supabase
      .from('stripe_links')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching Stripe links:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Failed to fetch Stripe links:', err);
    return [];
  }
};
