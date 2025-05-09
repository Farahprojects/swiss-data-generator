// _shared/balanceChecker.ts
import { sb } from "./supabaseAdmin.ts";

export interface BalanceCheckResult {
  isValid: boolean;
  userId: string | null;
  hasBalance: boolean;
  errorMessage?: string;
}

// Direct Supabase log to debug_logs
async function logDebug(source: string, message: string, data: unknown = null) {
  try {
    await sb.from("debug_logs").insert([{
      source,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : null,
    }]);
  } catch (err) {
    console.error("[logDebug] Failed to log:", err);
  }
}

export async function checkApiKeyAndBalance(clientApiKey: string): Promise<BalanceCheckResult> {
  await logDebug("balanceChecker", "Checking API key and balance", { clientApiKey });

  const res: BalanceCheckResult = {
    isValid: false,
    userId: null,
    hasBalance: false,
  };

  // Validate client API key and get user + balance via view
  const { data: row, error } = await sb
    .from("v_api_key_balance")
    .select("user_id, balance_usd")
    .eq("api_key", clientApiKey)
    .maybeSingle();

  await logDebug("balanceChecker", "v_api_key_balance result", { row, error });

  if (error || !row) {
    res.errorMessage = "We couldn’t verify your API key. Please log in at theraiapi.com to check your credentials.";
    return res;
  }

  res.isValid = true;
  res.userId = row.user_id;

  const balance = parseFloat(String(row.balance_usd));
  await logDebug("balanceChecker", "Parsed balance", { balance });

  if (!isFinite(balance) || balance <= 0) {
    res.errorMessage = `Your account is active, but balance is ${balance}.`;
    return res;
  }

  res.hasBalance = true;
  return res;
}
