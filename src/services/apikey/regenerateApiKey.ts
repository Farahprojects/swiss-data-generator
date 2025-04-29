
import { supabase } from "@/integrations/supabase/client";

export async function regenerateApiKey() {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      throw new Error('User not authenticated');
    }
    
    // Generate a more secure API key
    // Format: thp_[24 chars of hex]
    const secureBytes = new Uint8Array(12); // 12 bytes = 24 hex chars
    window.crypto.getRandomValues(secureBytes);
    const secureKey = 'thp_' + Array.from(secureBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Update API key directly using update query
    const { data, error } = await supabase
      .from('api_keys')
      .update({ 
        api_key: secureKey,
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
