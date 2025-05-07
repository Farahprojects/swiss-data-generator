
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
    
    // Try with multiple search approaches to find the link
    
    // 1. First try exact match
    let { data, error } = await supabase
      .from('stripe_links')
      .select('*')
      .eq('is_active', true)
      .eq('name', name)
      .maybeSingle();
    
    // 2. If no exact match found, try case-insensitive exact match
    if (!data && !error) {
      console.log(`No exact match found for "${name}", trying case-insensitive exact match`);
      const response = await supabase
        .from('stripe_links')
        .select('*')
        .eq('is_active', true)
        .ilike('name', name)
        .maybeSingle();
      
      if (response.data) {
        data = response.data;
        console.log(`Found link by case-insensitive match: ${data.name}`);
      }
      
      error = response.error;
    }
    
    // 3. If still no match, try partial match with keywords
    if (!data && !error) {
      console.log(`No exact case-insensitive match found, trying keywords for: "${name}"`);
      
      // Break the name into keywords
      const keywords = name.toLowerCase().split(' ');
      
      // Try to find a match that contains critical keywords
      for (const keyword of keywords) {
        // Skip common words that might not be distinctive
        if (['the', 'and', 'or', 'for', 'a', 'an'].includes(keyword)) continue;
        if (keyword.length < 3) continue; // Skip very short words
        
        const response = await supabase
          .from('stripe_links')
          .select('*')
          .eq('is_active', true)
          .ilike('name', `%${keyword}%`)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (response.data && response.data.length > 0) {
          data = response.data[0];
          console.log(`Found link by keyword "${keyword}": ${data.name}`);
          break;
        }
      }
    }
    
    if (error) {
      console.error(`Error fetching Stripe link with name ${name}:`, error);
      return null;
    }
    
    if (!data) {
      console.log(`No stripe link found for name: ${name}`);
      // Log all available stripe links to help with debugging
      const { data: allLinks } = await supabase
        .from('stripe_links')
        .select('name, is_active')
        .eq('is_active', true);
      
      console.log('Available active stripe links:', allLinks);
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

/**
 * Common link types used in the application
 * This helps standardize link name references across the app
 */
export const STRIPE_LINK_TYPES = {
  API_CREDITS_TOPUP: 'API Credits Top-up',
  MANAGE_SUBSCRIPTION: 'Manage Subscription',
  UPDATE_PAYMENT_METHOD: 'Update Payment Method',
  PLAN_PREFIX: 'Plan',
  ADDON_PREFIX: 'Addon'
};
