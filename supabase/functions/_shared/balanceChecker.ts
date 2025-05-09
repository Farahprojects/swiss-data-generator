// _shared/balanceChecker.ts
// Validates API key and verifies the user has positive credits.

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

  /*───────── 1. validate API key ─────────*/
  const { data: keyRow, error: keyErr } = await sb
    .from("api_keys")
    .select("user_id, is_active")
    .eq("api_key", apiKey)
    .maybeSingle();

  if (keyErr || !keyRow?.is_active) {
    res.errorMessage =
      "Hmm, we couldn't verify your API key. Please log in at theraiapi.com to check your credentials or generate a new key.";
    return res;
  }

  res.isValid = true;
  res.userId  = keyRow.user_id;

  /*───────── 2. fetch latest balance ─────*/
  const { data: balRow, error: balErr } = await sb
    .from("user_credits")
    .select("balance_usd")
    .eq("user_id", keyRow.user_id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (balErr) {
    res.errorMessage = `Balance lookup failed: ${balErr.message}`;
    return res;
  }

  if (!balRow) {
    res.errorMessage =
      "Your account is active, but there's no balance record. (DEBUG – balance: none)";
    return res;
  }

  const balance = Number(balRow.balance_usd);
  if (isNaN(balance) || balance <= 0) {
    res.errorMessage =
      `Your account is active, but available balance is ${balance}. (DEBUG – balance)`;
    return res;
  }

  // balance positive → success
  res.hasBalance = true;
  return res;
}
