

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const log = (msg: string, ...args: any[]) =>
    console.log(`[PASSWORD-RESET:${requestId}] ${msg}`, ...args);

  function respond(status: number, body: Record<string, any>) {
    log("Responding:", status, body);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  let email = "";
  try {
    const body = await req.json();
    email = (body.email ?? "").toLowerCase();
    log("Parsed request:", { email });
  } catch {
    return respond(400, { error: "Invalid JSON" });
  }

  if (!email) {
    return respond(400, { error: "Email is required" });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    return respond(500, { error: "Missing environment variables" });
  }

  const supabase = createClient(url, key);


  try {
    // Use Supabase's built-in password reset flow
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://auth.therai.co?type=password"
    });

    if (resetError) {
      log("Password reset email failed:", resetError.message);
      return respond(500, { error: "Password reset email failed", details: resetError.message });
    }

    log(`✔ Password reset email sent to ${email}`);
    return respond(200, { status: "sent", message: "Password reset email sent" });
  } catch (err: any) {
    return respond(500, { error: "Password reset failed", details: err.message });
  }

});

