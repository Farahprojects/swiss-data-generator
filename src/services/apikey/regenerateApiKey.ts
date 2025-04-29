
import { supabase } from "@/integrations/supabase/client";

export async function regenerateApiKey() {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .rpc('generate_new_api_key', {
        p_user_id: user.user.id
      });
    
    if (error) {
      console.error('Error regenerating API key:', error);
      throw error;
    }
    
    return { apiKey: data };
  } catch (error) {
    console.error('Error regenerating API key:', error);
    throw error;
  }
}
