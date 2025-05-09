
// Balance checker utility
// Verifies if a user has sufficient credits for API calls

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Supabase client with better error handling
const initSupabase = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[balanceChecker] Missing Supabase credentials");
    throw new Error("Missing Supabase credentials");
  }
  
  // Log the URL and first few chars of the key for debugging
  console.log(`[balanceChecker] Initializing Supabase client with URL: ${supabaseUrl}, Key: ${supabaseServiceKey.substring(0, 8)}...`);
  
  try {
    return createClient(supabaseUrl, supabaseServiceKey);
  } catch (err) {
    console.error(`[balanceChecker] Error initializing Supabase client: ${err instanceof Error ? err.message : String(err)}`);
    throw new Error(`Failed to initialize Supabase client: ${err instanceof Error ? err.message : String(err)}`);
  }
};

export interface BalanceCheckResult {
  isValid: boolean;
  userId: string | null;
  hasBalance: boolean;
  errorMessage?: string;
}

/**
 * Validates an API key and checks if the associated user has sufficient balance
 * 
 * @param apiKey - The API key to validate
 * @returns Object containing validation results
 */
export const checkApiKeyAndBalance = async (apiKey: string): Promise<BalanceCheckResult> => {
  console.log(`[balanceChecker] Checking API key and balance for key: ${apiKey.substring(0, 4)}...`);
  
  // Initialize result with default values
  const result: BalanceCheckResult = {
    isValid: false,
    userId: null,
    hasBalance: false
  };

  // Maximum retry attempts for authentication issues
  const maxRetries = 2;
  let retryCount = 0;
  let lastError: Error | null = null;

  while (retryCount <= maxRetries) {
    try {
      if (retryCount > 0) {
        console.log(`[balanceChecker] Retry attempt ${retryCount} of ${maxRetries}`);
      }
      
      const supabase = initSupabase();
      
      // Step 1: Validate the API key
      console.log("[balanceChecker] Querying api_keys table to validate key");
      const { data: apiKeyData, error: apiKeyError } = await supabase
        .from("api_keys")
        .select("user_id, is_active")
        .eq("api_key", apiKey)
        .maybeSingle();
      
      if (apiKeyError) {
        console.error(`[balanceChecker] API key validation error: ${apiKeyError.message}`);
        if (apiKeyError.message?.includes("JWT")) {
          // If this is a JWT error, retry
          if (retryCount < maxRetries) {
            retryCount++;
            lastError = apiKeyError;
            // Add a small delay before retry
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
        }
        result.errorMessage = "Hmm, we couldn't verify your API key. Please log in at theraiapi.com to check your credentials or generate a new key.";
        return result;
      }
      
      if (!apiKeyData || !apiKeyData.is_active) {
        console.log(`[balanceChecker] API key not found or inactive: ${!!apiKeyData}, active: ${apiKeyData?.is_active}`);
        result.errorMessage = "Hmm, we couldn't verify your API key. Please log in at theraiapi.com to check your credentials or generate a new key.";
        return result;
      }
      
      // API key is valid
      result.isValid = true;
      result.userId = apiKeyData.user_id;
      console.log(`[balanceChecker] API key validated successfully for user: ${apiKeyData.user_id}`);
      
      // Step 2: Check user balance
      console.log("[balanceChecker] Querying user_credits table to check balance");
      const { data: creditData, error: creditError } = await supabase
        .from("user_credits")
        .select("balance_usd")
        .eq("user_id", apiKeyData.user_id)
        .maybeSingle();
      
      if (creditError) {
        console.error(`[balanceChecker] Credit check error: ${creditError.message}`);
        result.errorMessage = "We encountered an issue checking your account balance.";
        return result;
      }
      
      if (!creditData || creditData.balance_usd <= 0) {
        console.log(`[balanceChecker] Insufficient balance for user ${apiKeyData.user_id}: ${creditData?.balance_usd ?? 'no balance record'}`);
        result.errorMessage = "Your account is active, but there's an issue with your payment method. Please log in at theraiapi.com to update your billing details and continue using the service.";
        return result;
      }
      
      // User has sufficient balance
      result.hasBalance = true;
      console.log(`[balanceChecker] Validation successful for user ${apiKeyData.user_id}, balance: ${creditData.balance_usd}`);
      
      return result;
      
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[balanceChecker] Unexpected error on attempt ${retryCount}: ${lastError.message}`);
      
      // Only retry on network or authentication errors
      if (retryCount < maxRetries && 
          (lastError.message.includes("network") || 
           lastError.message.includes("JWT") || 
           lastError.message.includes("auth"))) {
        retryCount++;
        // Add a small delay before retry
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      
      break;
    }
  }
  
  // If we've exhausted retries, return the last error
  result.errorMessage = `An unexpected error occurred during validation: ${lastError?.message || "Unknown error"}`;
  return result;
};
