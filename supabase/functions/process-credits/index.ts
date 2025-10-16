
// Supabase Edge Function – Process credits from topup logs


import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    console.log("Starting process-credits function");
    
    const { data: logs, error: fetchErr } = await supabase
      .from("topup_logs")
      .select("id, user_id, amount_cents")
      .eq("credited", false);

    if (fetchErr) {
      console.error("Failed to fetch logs:", fetchErr);
      return new Response(JSON.stringify({ error: "Error fetching logs" }), { status: 500, headers: CORS });
    }

    console.log(`Found ${logs?.length || 0} uncredited top-up logs`);
    
    if (!logs?.length) {
      return new Response(JSON.stringify({ message: "No uncredited logs found" }), { status: 200, headers: CORS });
    }

    const results = [];
    for (const log of logs) {
      const amountUsd = log.amount_cents / 100;
      console.log(`Processing log ${log.id} for user ${log.user_id}: $${amountUsd}`);

      const { error: updateBalanceErr } = await supabase.rpc("increment_user_balance", {
        user_id_param: log.user_id,
        amount_param: amountUsd,
      });

      if (updateBalanceErr) {
        console.error(`Failed to update balance for ${log.user_id}:`, updateBalanceErr);
        results.push({ id: log.id, success: false, error: updateBalanceErr.message });
        continue;
      }

      const { error: updateLogErr } = await supabase
        .from("topup_logs")
        .update({ credited: true })
        .eq("id", log.id);

      if (updateLogErr) {
        console.error(`Failed to mark credited for log ${log.id}:`, updateLogErr);
        results.push({ id: log.id, success: false, error: updateLogErr.message });
      } else {
        console.log(`Successfully processed top-up log ${log.id}`);
        results.push({ id: log.id, success: true, amount_usd: amountUsd });
      }
    }

    return new Response(JSON.stringify({ 
      message: `Processed ${results.length} top-up credits`, 
      results 
    }), { status: 200, headers: CORS });
  } catch (err: any) {
    console.error("Process-credits function error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
});
