
import { supabase } from "@/integrations/supabase/client";

export interface StripeProduct {
  id: string;
  product_id: string;
  price_id: string;
  name: string;
  description: string | null;
  amount_usd: number;
  currency: string;
  type: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const fetchStripeProducts = async (): Promise<StripeProduct[]> => {
  try {
    const { data, error } = await supabase
      .from('stripe_products')
      .select('*')
      .eq('active', true)
      .order('amount_usd', { ascending: true });
    
    if (error) {
      console.error('Error fetching stripe products:', error);
      throw error;
    }
    
    return data || [];
  } catch (err) {
    console.error('Failed to fetch stripe products:', err);
    return [];
  }
};

export const getProductByName = async (name: string): Promise<StripeProduct | null> => {
  try {
    console.log(`Searching for product with name: ${name}`);
    // First try exact match
    let { data, error } = await supabase
      .from('stripe_products')
      .select('*')
      .eq('active', true)
      .eq('name', name)
      .maybeSingle();
    
    // If no exact match, try case-insensitive partial match
    if (!data && !error) {
      console.log('No exact match found, trying case-insensitive search');
      const response = await supabase
        .from('stripe_products')
        .select('*')
        .eq('active', true)
        .ilike('name', `%${name}%`)
        .maybeSingle();
      
      data = response.data;
      error = response.error;
    }
    
    if (error) {
      console.error(`Error fetching product with name ${name}:`, error);
      return null;
    }
    
    console.log(`Found product:`, data);
    return data;
  } catch (err) {
    console.error(`Failed to fetch product with name ${name}:`, err);
    return null;
  }
};

export const getProductByType = async (type: string): Promise<StripeProduct[]> => {
  try {
    const { data, error } = await supabase
      .from('stripe_products')
      .select('*')
      .eq('active', true)
      .eq('type', type);
    
    if (error) {
      console.error(`Error fetching products with type ${type}:`, error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error(`Failed to fetch products with type ${type}:`, err);
    return [];
  }
};

export const getActiveCreditProduct = async (): Promise<StripeProduct | null> => {
  try {
    const { data, error } = await supabase
      .from('stripe_products')
      .select('*')
      .eq('active', true)
      .eq('type', 'credit')
      .single();
    
    if (error) {
      console.error('Error fetching active credit product:', error);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Failed to fetch active credit product:', err);
    return null;
  }
};

// Function to ensure we have a credit product in the database
export const ensureCreditProduct = async () => {
  try {
    // Check if we already have a credit product
    const { data, error } = await supabase
      .from('stripe_products')
      .select('*')
      .eq('active', true)
      .eq('type', 'credit')
      .maybeSingle();
    
    if (error) {
      console.error('Error checking for credit product:', error);
      return;
    }
    
    // If no credit product exists, create one
    if (!data) {
      console.log('No credit product found, please add one in the Supabase dashboard');
    }
  } catch (err) {
    console.error('Failed to ensure credit product:', err);
  }
};
