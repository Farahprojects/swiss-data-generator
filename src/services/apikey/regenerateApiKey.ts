
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
    
    // First, check if the user already has an API key
    const { data: existingKey, error: fetchError } = await supabase
      .from('api_keys')
      .select('id')
      .eq('user_id', user.user.id)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error checking existing API key:', fetchError);
      throw fetchError;
    }

    let result;
    
    if (existingKey) {
      // Update existing API key
      result = await supabase
        .from('api_keys')
        .update({ 
          api_key: secureKey,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.user.id)
        .select('api_key')
        .maybeSingle();
    } else {
      // Insert new API key
      result = await supabase
        .from('api_keys')
        .insert({ 
          user_id: user.user.id,
          api_key: secureKey,
          updated_at: new Date().toISOString()
        })
        .select('api_key')
        .maybeSingle();
    }
    
    if (result.error) {
      console.error('Error regenerating API key:', result.error);
      throw result.error;
    }
    
    return { apiKey: result.data?.api_key };
  } catch (error) {
    console.error('Error regenerating API key:', error);
    throw error;
  }
}
