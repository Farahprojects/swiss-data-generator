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

  const result: BalanceCheckResult = {
    isValid: false,
    userId: null,
    hasBalance: false,
    errorMessage: undefined
  };

  try {
    // Step 1: Validate API key
    const apiKeyRes = await fetch(`${supabaseUrl}/rest/v1/api_keys?api_key=eq.${apiKey}`, {
      method: "GET",
      headers
    });

    if (!apiKeyRes.ok) {
      throw new Error(`API key fetch failed: ${apiKeyRes.status}`);
    }

    const apiKeyData = (await apiKeyRes.json())[0];

    if (!apiKeyData || !apiKeyData.is_active) {
      result.errorMessage = "Hmm, we couldn’t verify your API key. Please log in at theraiapi.com to check your credentials or generate a new key.";
      return result;
    }

    result.isValid = true;
    result.userId = apiKeyData.user_id;

    // Step 2: Check balance
    const creditRes = await fetch(`${supabaseUrl}/rest/v1/user_credits?user_id=eq.${apiKeyData.user_id}`, {
      method: "GET",
      headers
    });

    if (!creditRes.ok) {
      throw new Error(`Credit fetch failed: ${creditRes.status}`);
    }

    const creditData = (await creditRes.json())[0];

    if (!creditData || creditData.balance_usd <= 0) {
      result.errorMessage = "Your account is active, but there's an issue with your payment method. Please log in at theraiapi.com to update your billing details.";
      return result;
    }

    result.hasBalance = true;
    return result;

  } catch (err) {
    console.error(`[balanceChecker] Error: ${(err instanceof Error ? err.message : String(err))}`);
    result.errorMessage = "Unexpected error during balance validation. Please try again.";
    return result;
  }
};
