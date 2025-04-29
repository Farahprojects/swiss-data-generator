
import { supabase } from "@/integrations/supabase/client";

export async function disableApiKey(disable = true) {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('api_keys')
      .update({ is_active: !disable })
      .eq('user_id', user.user.id)
      .select('is_active');
    
    if (error) {
      console.error('Error updating API key status:', error);
      throw error;
    }
    
    return { isActive: data?.[0]?.is_active || false };
  } catch (error) {
    console.error('Error updating API key status:', error);
    throw error;
  }
}
