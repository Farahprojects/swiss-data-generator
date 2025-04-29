
import { supabase } from "@/integrations/supabase/client";

export async function fetchApiKey() {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('api_keys')
      .select('api_key, is_active, created_at, updated_at')
      .eq('user_id', user.user.id)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching API key:', error);
      throw error;
    }
    
    return {
      apiKey: data?.api_key || null,
      isActive: data?.is_active || false,
      createdAt: data?.created_at || null,
      updatedAt: data?.updated_at || null
    };
  } catch (error) {
    console.error('Error fetching API key:', error);
    throw error;
  }
}
