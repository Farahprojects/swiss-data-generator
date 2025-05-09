
// balanceChecker.ts
// Validates API key and checks if the user has sufficient credits

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("[balanceChecker] Missing Supabase credentials");
  throw new Error("Missing Supabase credentials");
}

const headers = {
  "apikey": supabaseServiceKey,
  "Authorization": `Bearer ${supabaseServiceKey}`,
  "Content-Type": "application/json"
};

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
    console.log(`[balanceChecker] Making request to: ${supabaseUrl}/rest/v1/api_keys?api_key=eq.${apiKey}`);
    const apiKeyRes = await fetch(`${supabaseUrl}/rest/v1/api_keys?api_key=eq.${apiKey}`, {
      method: "GET",
      headers
    }).catch(fetchError => {
      console.error(`[balanceChecker] Fetch error during API key validation: ${fetchError.message}`);
      throw fetchError;
    });

    if (!apiKeyRes.ok) {
      const errorBody = await apiKeyRes.text().catch(() => "Unable to read error response");
      console.error(`[balanceChecker] API key fetch failed: Status ${apiKeyRes.status}, Body: ${errorBody}`);
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
    console.log(`[balanceChecker] Checking balance for user: ${apiKeyData.user_id}`);
    const creditRes = await fetch(`${supabaseUrl}/rest/v1/user_credits?user_id=eq.${apiKeyData.user_id}`, {
      method: "GET",
      headers
    }).catch(fetchError => {
      console.error(`[balanceChecker] Fetch error during balance check: ${fetchError.message}`);
      throw fetchError;
    });

    if (!creditRes.ok) {
      const errorBody = await creditRes.text().catch(() => "Unable to read error response");
      console.error(`[balanceChecker] Credit fetch failed: Status ${creditRes.status}, Body: ${errorBody}`);
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
    }
    
    console.error(`[balanceChecker] Error: ${errorMessage}`);
    result.errorMessage = "Unexpected error during balance validation. Please try again.";
    return result;
  }
};
