
import { supabase } from "@/integrations/supabase/client";

export async function regenerateApiKey() {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      throw new Error('User not authenticated');
    }
    
    // Update API key directly using update query instead of RPC call
    const { data, error } = await supabase
      .from('api_keys')
      .update({ 
        api_key: 'thp_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.user.id)
      .select('api_key')
      .single();
    
    if (error) {
      console.error('Error regenerating API key:', error);
      throw error;
    }
    
    return { apiKey: data.api_key };
  } catch (error) {
    console.error('Error regenerating API key:', error);
    throw error;
  }
}
