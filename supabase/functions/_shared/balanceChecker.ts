// _shared/balanceChecker.ts
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

export interface BalanceCheckResult {
  isValid: boolean;
  userId: string | null;
  hasBalance: boolean;
  errorMessage?: string;
}

// Logs to debug_logs with JSON-safe payload
async function logDebug(source: string, message: string, data: unknown = null) {
  try {
    await sb.from("debug_logs").insert([{
      source,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : null,
    }]);
  } catch (err) {
    console.error(`[debug_logs] Failed to log from ${source}:`, err);
  }
}

export async function checkApiKeyAndBalance(apiKey: string): Promise<BalanceCheckResult> {
  // 🔥 Manual test log – forces a write on every call
  await sb.from("debug_logs").insert([{
    source: "balanceChecker",
    message: "MANUAL test log from balanceChecker",
    data: { now: new Date().toISOString(), test: true }
  }]);

  await logDebug("balanceChecker", "START: checking API key and balance", { apiKey });

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

  await logDebug("balanceChecker", "Query result", { row, error });

  if (error || !row) {
    res.errorMessage = "Hmm, we couldn't verify your API key. Please log in at theraiapi.com to check your credentials or generate a new key.";
    await logDebug("balanceChecker", "API key invalid or not found", { error, row });
    return res;
  }

  res.isValid = true;
  res.userId = row.user_id;

  const balance = parseFloat(String(row.balance_usd));
  await logDebug("balanceChecker", "Parsed balance", { balance });

  if (!isFinite(balance) || balance <= 0) {
    res.errorMessage = `Your account is active, but available balance is ${balance}.`;
    return res;
  }

  res.hasBalance = true;
  return res;
}
