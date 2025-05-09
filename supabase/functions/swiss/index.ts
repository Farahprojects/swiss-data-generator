// _shared/balanceChecker.ts

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl        = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

export interface BalanceCheckResult {
  isValid: boolean;
  userId: string | null;
  hasBalance: boolean;
  errorMessage?: string;
}

// Logging helper
async function logDebug(source: string, message: string, data: any = null) {
  try {
    await sb.from("debug_logs").insert([{ source, message, data }]);
  } catch (err) {
    console.error("[debug_logs] Failed to log:", err);
  }
}

export async function checkApiKeyAndBalance(apiKey: string): Promise<BalanceCheckResult> {
  await logDebug("balanceChecker", "START: checking API key + balance", { apiKey });

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

  await logDebug("balanceChecker", "Query result from v_api_key_balance", { row, error });

  if (error) {
    res.errorMessage = `Lookup failed: ${error.message}`;
    return res;
  }

  if (!row) {
    res.errorMessage = "Hmm, we couldn't verify your API key. Please log in at theraiapi.com to check your credentials or generate a new key.";
    return res;
  }

  res.isValid = true;
  res.userId = row.user_id;

  const balance = parseFloat(String(row.balance_usd));
  await logDebug("balanceChecker", "Parsed balance value", { balance });

  if (!isFinite(balance)) {
    res.errorMessage = "Parsed balance was not a number.";
    return res;
  }

  if (balance <= 0) {
    res.errorMessage = `Your account is active, but available balance is ${balance}.`;
    return res;
  }

  res.hasBalance = true;
  return res;
}
