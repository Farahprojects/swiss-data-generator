
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ORCHESTRATOR_URL = `${SUPABASE_URL}/functions/v1/report-orchestrator`;

const EDGE_ENGINES = ["standard-report", "standard-report-one", "standard-report-two", "standard-report-three"];
let engineIndex = 0; // For round-robin

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function getNextEngine() {
  const engine = EDGE_ENGINES[engineIndex];
  engineIndex = (engineIndex + 1) % EDGE_ENGINES.length;
  return engine;
}

const fetchNextJob = async () => {
  const { data, error } = await supabase
    .from("report_queue")
    .select("*")
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Error fetching job: ${error.message}`);
  return data;
};

const markAsProcessing = async (id: string) => {
  const { error } = await supabase
    .from("report_queue")
    .update({ status: "processing", started_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Error marking job as processing: ${error.message}`);
};

const updateJobResult = async (id: string, success: boolean, result: any, engine: string) => {
  const updateFields: any = {
    status: success ? "completed" : "failed",
    engine_used: engine,
    completed_at: new Date().toISOString(),
    result: success ? result : null,
    error_message: success ? null : result
  };

  const { error } = await supabase
    .from("report_queue")
    .update(updateFields)
    .eq("id", id);

  if (error) throw new Error(`Error updating job result: ${error.message}`);
};

Deno.serve(async (_req) => {
  try {
    const job = await fetchNextJob();
    if (!job) return new Response("No pending jobs", { status: 204 });

    await markAsProcessing(job.id);

    const engine = getNextEngine();
    const orchestratorPayload = { ...job.payload, engine };

    const res = await fetch(ORCHESTRATOR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orchestratorPayload)
    });

    const result = await res.json();
    await updateJobResult(job.id, result.success, result.success ? result.report : result.errorMessage, engine);

    return new Response("Job dispatched", { status: 200 });
  } catch (err) {
    console.error("Dispatcher error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
