
// balanceChecker.ts
// Validates API key and checks if the user has sufficient credits

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("[balanceChecker] Missing Supabase credentials");
  throw new Error("Missing Supabase credentials");
}

// Add more debug information
console.log(`[balanceChecker] Using Supabase URL: ${supabaseUrl}`);
console.log(`[balanceChecker] Service key format check: ${supabaseServiceKey.startsWith("eyJ") ? "Correct format (starts with eyJ)" : "INCORRECT format"}`);

const headers = {
  "apikey": supabaseServiceKey,
  "Authorization": `Bearer ${supabaseServiceKey}`,
  "Content-Type": "application/json"
};

// Debug the headers
console.log(`[balanceChecker] Authorization header: Bearer ${supabaseServiceKey.substring(0, 10)}...`);

export interface BalanceCheckResult {
  isValid: boolean;
  userId: string | null;
  hasBalance: boolean;
  errorMessage?: string;
}

export const checkApiKeyAndBalance = async (apiKey: string): Promise<BalanceCheckResult> => {
  console.log(`[balanceChecker] Checking API key and balance for: ${apiKey.substring(0, 4)}...`);
  console.log(`[balanceChecker] Using service key: ${supabaseServiceKey.substring(0, 10)}...`);

  const result: BalanceCheckResult = {
    isValid: false,
    userId: null,
    hasBalance: false,
    errorMessage: undefined
  };

  try {
    // Step 1: Validate API key
    const apiKeyUrl = `${supabaseUrl}/rest/v1/api_keys?api_key=eq.${apiKey}`;
    console.log(`[balanceChecker] Making request to: ${apiKeyUrl}`);
    
    try {
      const apiKeyRes = await fetch(apiKeyUrl, {
        method: "GET",
        headers
      });
      
      console.log(`[balanceChecker] API key fetch status: ${apiKeyRes.status}`);
      
      if (!apiKeyRes.ok) {
        const errorBody = await apiKeyRes.text().catch(() => "Unable to read error response");
        console.error(`[balanceChecker] API key fetch failed: Status ${apiKeyRes.status}, Body: ${errorBody}`);
        
        if (errorBody.includes("JWT") || apiKeyRes.status === 401) {
          throw new Error(`JWT ERROR in API key validation: ${errorBody}`);
        }
        
        throw new Error(`API key fetch failed: ${apiKeyRes.status} - ${errorBody}`);
      }

      const apiKeyData = (await apiKeyRes.json())[0];
      console.log(`[balanceChecker] API key validation response received: ${apiKeyData ? "Data found" : "No data"}`);

      if (!apiKeyData || !apiKeyData.is_active) {
        console.warn(`[balanceChecker] Invalid or inactive API key: ${apiKey.substring(0, 4)}...`);
        result.errorMessage = "Hmm, we couldn't verify your API key. Please log in at theraiapi.com to check your credentials or generate a new key.";
        return result;
      }

      console.log(`[balanceChecker] API key valid for user: ${apiKeyData.user_id}`);
      result.isValid = true;
      result.userId = apiKeyData.user_id;

      // Step 2: Check balance
      const creditUrl = `${supabaseUrl}/rest/v1/user_credits?user_id=eq.${apiKeyData.user_id}`;
      console.log(`[balanceChecker] Checking balance for user: ${apiKeyData.user_id} at URL: ${creditUrl}`);
      
      try {
        const creditRes = await fetch(creditUrl, {
          method: "GET",
          headers
        });
        
        console.log(`[balanceChecker] Credit fetch status: ${creditRes.status}`);
        
        if (!creditRes.ok) {
          const errorBody = await creditRes.text().catch(() => "Unable to read error response");
          console.error(`[balanceChecker] Credit fetch failed: Status ${creditRes.status}, Body: ${errorBody}`);
          
          if (errorBody.includes("JWT") || creditRes.status === 401) {
            throw new Error(`JWT ERROR in balance check: ${errorBody}`);
          }
          
          throw new Error(`Credit fetch failed: ${creditRes.status} - ${errorBody}`);
        }

        const creditData = (await creditRes.json())[0];
        console.log(`[balanceChecker] Credit check response: ${creditData ? `Balance: ${creditData.balance_usd}` : "No credit data"}`);

        if (!creditData || creditData.balance_usd <= 0) {
          console.warn(`[balanceChecker] Insufficient balance for user: ${apiKeyData.user_id}`);
          result.errorMessage = "Your account is active, but there's an issue with your payment method. Please log in at theraiapi.com to update your billing details.";
          return result;
        }

        console.log(`[balanceChecker] User ${apiKeyData.user_id} has sufficient balance: ${creditData.balance_usd}`);
        result.hasBalance = true;
        return result;
      } catch (balanceError) {
        // Check if this is a JWT error
        if (String(balanceError).includes("JWT") || String(balanceError).includes("401")) {
          console.error(`[balanceChecker] 🚨 JWT ERROR 🚨 during balance check: ${balanceError instanceof Error ? balanceError.message : String(balanceError)}`);
          throw balanceError; // Re-throw to be caught by outer catch block
        }
        
        console.error(`[balanceChecker] Error checking balance: ${balanceError instanceof Error ? balanceError.message : String(balanceError)}`);
        result.errorMessage = "Error checking account balance. Please try again.";
        return result;
      }
      
    } catch (apiKeyError) {
      // Check if this is a JWT error
      if (String(apiKeyError).includes("JWT") || String(apiKeyError).includes("401")) {
        console.error(`[balanceChecker] 🚨 JWT ERROR 🚨 during API key validation: ${apiKeyError instanceof Error ? apiKeyError.message : String(apiKeyError)}`);
        throw apiKeyError; // Re-throw to be caught by outer catch block
      }
      
      console.error(`[balanceChecker] Error validating API key: ${apiKeyError instanceof Error ? apiKeyError.message : String(apiKeyError)}`);
      result.errorMessage = "Error validating API key. Please try again.";
      return result;
    }

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    // Add special logging for JWT errors
    if (errorMessage.includes("JWT") || errorMessage.includes("401")) {
      console.error(`[balanceChecker] 🚨 JWT ERROR 🚨: ${errorMessage}`);
      console.error(`[balanceChecker] JWT Error details: Using service key starting with: ${supabaseServiceKey?.substring(0, 10) || "undefined"}...`);
      
      // Check if the Authorization header is properly formatted
      const authHeader = headers.Authorization;
      if (authHeader) {
        console.log(`[balanceChecker] Authorization header format check: ${authHeader.startsWith("Bearer ") ? "Correct" : "Incorrect"} format`);
      } else {
        console.error(`[balanceChecker] Authorization header is missing or malformed`);
      }
      
      result.errorMessage = `JWT Authentication Error: ${errorMessage}`;
      return result;
    }
    
    console.error(`[balanceChecker] Error: ${errorMessage}`);
    result.errorMessage = "Unexpected error during balance validation. Please try again.";
    return result;
  }
};
