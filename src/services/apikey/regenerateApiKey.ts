
import { supabase } from "@/integrations/supabase/client";

export async function regenerateApiKey() {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      throw new Error('User not authenticated');
    }
    
    // Generate a branded API key with "THE" prefix and 16 random chars
    const alphanumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomPart = '';
    
    // Generate 16 random alphanumeric characters
    const randomValues = new Uint8Array(16);
    window.crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < 16; i++) {
      randomPart += alphanumeric[randomValues[i] % alphanumeric.length];
    }
    
    // Combine to create the branded key
    const brandedKey = `THE_${randomPart}`;
    
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
          api_key: brandedKey,
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
          api_key: brandedKey,
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
