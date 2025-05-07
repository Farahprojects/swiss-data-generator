
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
    
    // First try exact match
    let { data, error } = await supabase
      .from('stripe_links')
      .select('*')
      .eq('is_active', true)
      .eq('name', name)
      .maybeSingle();
    
    // If no exact match found, try case-insensitive partial match
    if (!data && !error) {
      console.log(`No exact match found for "${name}", trying case-insensitive search`);
      const response = await supabase
        .from('stripe_links')
        .select('*')
        .eq('is_active', true)
        .ilike('name', `%${name}%`)
        .order('name')
        .limit(1);
      
      if (response.data && response.data.length > 0) {
        data = response.data[0];
        console.log(`Found link by partial match: ${data.name}`);
      }
      
      error = response.error;
    }
    
    if (error) {
      console.error(`Error fetching Stripe link with name ${name}:`, error);
      return null;
    }
    
    if (!data) {
      console.log(`No stripe link found for name: ${name}`);
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

/**
 * Gets the standard link name format that should be used in the database
 * Based on the type of link and optional identifier
 * @param type The link type (e.g., "Plan", "Addon", "Payment")
 * @param identifier Optional identifier (e.g., plan name, addon name)
 */
export const getStandardLinkName = (type: string, identifier?: string): string => {
  if (identifier) {
    return `${type} ${identifier}`;
  }
  return type;
};
