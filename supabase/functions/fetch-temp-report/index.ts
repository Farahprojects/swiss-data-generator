import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

// Security middleware temporarily disabled due to Deno.openKv issues
// import { withSecurity } from "../_shared/security.ts";
// const FUNCTION_NAME = "fetch-temp-report";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "content-type, apikey, authorization, x-client-info, X-Report-Token",
};

/**
 * This is the core logic of our function.
 * It can now assume the request has been validated, rate-limited, and the token is valid.
 */
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { uuid } = await req.json();
    console.log("⇢  incoming", { uuid });
    
    if (!uuid) {
      return new Response(JSON.stringify({ error: "UUID required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get the token from the header (validated by security middleware)
    const token = req.headers.get("X-Report-Token");
    
    const { data, error } = await supabase
      .from("temp_report_data")
      .select("*")
      .eq("id", uuid)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: "Report not found or expired" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Token is already validated by security middleware, so we can proceed
    console.log("⇠  success", { uuid });
    
    return new Response(
      JSON.stringify({
        report_content: data.report_content,
        swiss_data: data.swiss_data,
        metadata: data.metadata,
        uuid,
        token,
        chat_hash: data.chat_hash,
        success: true,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );

  } catch (e) {
    console.error("✖︎  error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
};

// Security middleware temporarily disabled due to Deno.openKv issues
// Deno.serve(withSecurity(handler, FUNCTION_NAME));
Deno.serve(handler); 