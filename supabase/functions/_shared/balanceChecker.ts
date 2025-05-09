// _shared/balanceChecker.ts
// Validates API key and verifies the user has positive credits via view

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl        = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Admin client – bypasses RLS
const sb: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

export interface BalanceCheckResult {
  isValid:    boolean;
  userId:     string | null;
  hasBalance: boolean;
  errorMessage?: string;
}

export async function checkApiKeyAndBalance(
  apiKey: string,
): Promise<BalanceCheckResult> {
  const res: BalanceCheckResult = {
    isValid: false,
    userId: null,
    hasBalance: false,
  };

  const { data: row, error } = await sb
    .from("v_api_key_balance")
    .select("user_id, balance_usd")
    .eq("api_key", apiKey)
    .maybeSingle();

  if (error) {
    res.errorMessage = `Lookup failed: ${error.message}`;
    return res;
  }

  if (!row) {
    res.errorMessage =
      "Hmm, we couldn't verify your API key. Please log in at theraiapi.com to check your credentials or generate a new key.";
    return res;
  }

  res.isValid = true;
  res.userId  = row.user_id;

  console.log("[balanceChecker] Row from view:", row);
  console.log("[balanceChecker] Raw balance value:", row.balance_usd);

  const balance = parseFloat(String(row.balance_usd));

  console.log("[balanceChecker] Parsed balance:", balance);

  if (!isFinite(balance) || balance <= 0) {
    res.errorMessage = `Your account is active, but available balance is ${balance}.`;
    return res;
  }

  res.hasBalance = true;
  return res;
}
