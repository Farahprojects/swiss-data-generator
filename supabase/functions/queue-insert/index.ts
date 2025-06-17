
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  console.log(`[queue-insert] Received ${req.method} request`);
  
  if (req.method !== "POST") {
    console.log(`[queue-insert] Method not allowed: ${req.method}`);
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const payload = await req.json();
    console.log(`[queue-insert] Processing request for report_type: ${payload.report_type}, endpoint: ${payload.endpoint}`);

    const {
      report_type,
      endpoint,
      user_id,
      chartData
    } = payload;

    if (!report_type || !endpoint || !chartData) {
      console.error(`[queue-insert] Missing required fields - report_type: ${!!report_type}, endpoint: ${!!endpoint}, chartData: ${!!chartData}`);
      return new Response("Missing required fields", { status: 400 });
    }

    console.log(`[queue-insert] Inserting job into queue for user: ${user_id || 'anonymous'}`);

    const { data, error } = await supabase.from("report_queue").insert({
      status: "pending",
      priority: 5,
      payload: chartData,
      report_type,
      endpoint,
      user_id: user_id ?? null,
      attempts: 0,
      max_attempts: 3
    }).select('id').single();

    if (error) {
      console.error(`[queue-insert] Failed to insert into report_queue:`, error.message);
      return new Response("Database error", { status: 500 });
    }

    console.log(`[queue-insert] Successfully queued job with ID: ${data.id}`);

    return new Response(JSON.stringify({ 
      message: "Job queued successfully",
      job_id: data.id,
      status: "pending"
    }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`[queue-insert] Insert-to-queue error:`, err);
    return new Response("Invalid request body", { status: 400 });
  }
});
