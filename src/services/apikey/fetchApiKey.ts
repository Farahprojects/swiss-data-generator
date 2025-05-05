
import { supabase } from "@/integrations/supabase/client";

export async function fetchApiKey() {
  try {
    console.log("fetchApiKey: Getting current user...");
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      console.log("fetchApiKey: No authenticated user found");
      throw new Error('User not authenticated');
    }
    
    console.log("fetchApiKey: Fetching API key for user:", user.user.id);
    const { data, error } = await supabase
      .from('api_keys')
      .select('api_key, is_active, created_at, updated_at')
      .eq('user_id', user.user.id)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching API key:', error);
      throw error;
    }
    
    console.log("fetchApiKey: API key data retrieved:", data ? "Key exists" : "No key found");
    
    return {
      apiKey: data?.api_key || null,
      isActive: data?.is_active || false,
      createdAt: data?.created_at || null,
      updatedAt: data?.updated_at || null
    };
  } catch (error) {
    console.error('Error in fetchApiKey:', error);
    throw error;
  }
}
