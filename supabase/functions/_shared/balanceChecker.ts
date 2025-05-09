// _shared/balanceChecker.ts
// Validates API key and checks if the user has sufficient credits

const supabaseUrl        = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("[balanceChecker] Missing Supabase credentials");
  throw new Error("Missing Supabase credentials");
}

console.log(`[balanceChecker] Using Supabase URL: ${supabaseUrl}`);
console.log(
  `[balanceChecker] Service key format check: ${
    supabaseServiceKey.startsWith("eyJ") ? "Looks like a JWT" : "Service-role key (not a JWT)"
  }`,
);

// ── ONLY apikey header; NO Authorization header ─────────────────────────────
const headers = {
  "apikey": supabaseServiceKey,
  "Content-Type": "application/json",
};

export interface BalanceCheckResult {
  isValid:    boolean;
  userId:     string | null;
  hasBalance: boolean;
  errorMessage?: string;
}

export const checkApiKeyAndBalance = async (
  apiKey: string,
): Promise<BalanceCheckResult> => {
  console.log(
    `[balanceChecker] Checking API key and balance for: ${apiKey.substring(0, 4)}...`,
  );

  const result: BalanceCheckResult = {
    isValid: false,
    userId: null,
    hasBalance: false,
  };

  try {
    /*────────────────── 1 Validate API key ──────────────────*/
    const apiKeyUrl =
      `${supabaseUrl}/rest/v1/api_keys?api_key=eq.${apiKey}`;
    const apiKeyRes = await fetch(apiKeyUrl, { headers });

    if (!apiKeyRes.ok) {
      const body = await apiKeyRes.text().catch(() => "");
      throw new Error(
        `API-key lookup failed [${apiKeyRes.status}]: ${body}`,
      );
    }

    const apiKeyData = (await apiKeyRes.json())[0];
    if (!apiKeyData?.is_active) {
      result.errorMessage =
        "Hmm, we couldn't verify your API key. Please log in at theraiapi.com to check your credentials or generate a new key.";
      return result;
    }

    result.isValid = true;
    result.userId = apiKeyData.user_id;

    /*────────────────── 2 Check balance ─────────────────────*/
    const creditUrl =
      `${supabaseUrl}/rest/v1/user_credits?user_id=eq.${apiKeyData.user_id}`;
    const creditRes = await fetch(creditUrl, { headers });

    if (!creditRes.ok) {
      const body = await creditRes.text().catch(() => "");
      throw new Error(`Balance lookup failed [${creditRes.status}]: ${body}`);
    }

    const creditData = (await creditRes.json())[0];
    if (!creditData || creditData.balance_usd <= 0) {
      result.errorMessage =
        "Your account is active, but there's an issue with your payment method. Please log in at theraiapi.com to update your billing details.";
      return result;
    }

    result.hasBalance = true;
    return result;
  } catch (err) {
    result.errorMessage = (err as Error).message;
    return result;
  }
};
