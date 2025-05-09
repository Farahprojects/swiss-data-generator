// _shared/balanceChecker.ts
// Validates API key and verifies the user has positive credits via view, with Supabase logging

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

// Helper: log to Supabase debug_logs
async function logDebug(source: string, message: string, data: any = null) {
  try {
    await sb.from("debug_logs").insert([{
      source,
      message,
      data
    }]);
  } catch (err) {
    console.error("[debug_logs] Failed to write log:", err);
  }
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
    await logDebug("balanceChecker", "Error fetching v_api_key_balance", { apiKey, error });
    return res;
  }

  if (!row) {
    res.errorMessage = "Hmm, we couldn't verify your API key. Please log in at theraiapi.com to check your credentials or generate a new key.";
    await logDebug("balanceChecker", "No match found in v_api_key_balance", { apiKey });
    return res;
  }

  res.isValid = true;
  res.userId  = row.user_id;

  const balance = parseFloat(String(row.balance_usd));

  await logDebug("balanceChecker", "Row from view", row);
  await logDebug("balanceChecker", "Parsed balance", { balance });

  if (!isFinite(balance) || balance <= 0) {
    res.errorMessage = `Your account is active, but available balance is ${balance}.`;
    return res;
  }

  res.hasBalance = true;
  return res;
}
