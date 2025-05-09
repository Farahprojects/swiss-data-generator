// _shared/balanceChecker.ts
// Validates API key and verifies the user has positive credits.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl        = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Single admin client – bypasses RLS
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
  console.log(`[balanceChecker] 🔑 ${apiKey.slice(0, 5)}…`);

  const res: BalanceCheckResult = {
    isValid: false,
    userId: null,
    hasBalance: false,
  };

  /*───────── 1. validate API key ─────────*/
  const { data: keyRow, error: keyErr } = await sb
    .from("api_keys")
    .select("user_id, is_active")
    .eq("api_key", apiKey)
    .maybeSingle();

  if (keyErr || !keyRow?.is_active) {
    console.warn("[balanceChecker] API key not found / inactive");
    res.errorMessage =
      "Hmm, we couldn't verify your API key. Please log in at theraiapi.com to check your credentials or generate a new key.";
    return res;
  }

  res.isValid = true;
  res.userId  = keyRow.user_id;

  /*───────── 2. latest balance row ───────*/
  const { data: balanceRow, error: balErr } = await sb
    .from("user_credits")
    .select("balance_usd")
    .eq("user_id", keyRow.user_id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (balErr) {
    console.error("[balanceChecker] Balance lookup failed:", balErr.message);
    res.errorMessage = "Error checking account balance. Please try again.";
    return res;
  }

  if (!balanceRow) {
    console.warn("[balanceChecker] No balance row for user", keyRow.user_id);
    res.errorMessage =
      "Your account is active, but there's no balance record. Please contact support.";
    return res;
  }

  const balance = Number(balanceRow.balance_usd);
  console.log(
    `[balanceChecker] Balance for ${keyRow.user_id}: ${balance.toFixed(2)} USD`,
  );

  if (isNaN(balance) || balance <= 0) {
    res.errorMessage =
      "Your account is active, but there's an issue with your payment method. Please log in at theraiapi.com to update your billing details.";
    return res;
  }

  res.hasBalance = true;
  return res;
}
