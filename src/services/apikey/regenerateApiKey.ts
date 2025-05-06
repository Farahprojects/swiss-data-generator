
import { supabase } from "@/integrations/supabase/client";

export async function regenerateApiKey() {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user?.user) {
      throw new Error('User not authenticated');
    }
    
    // Generate a branded API key with "THE" prefix and 15 random hex chars
    // This matches the format in the handle_new_user() database function
    const randomBytes = new Uint8Array(12);
    window.crypto.getRandomValues(randomBytes);
    const randomHex = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 15);
    
    // Combine to create the branded key (format: THE + 15 hex chars)
    const brandedKey = `THE${randomHex}`;
    
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
