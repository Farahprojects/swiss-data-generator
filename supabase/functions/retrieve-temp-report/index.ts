import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "content-type, apikey, authorization, x-client-info",
};

function genToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(text: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
}

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { uuid, token, source } = await req.json();
    console.log("⇢  incoming", { uuid, tokenPresent: !!token, source });
    
    if (!uuid) {
      return new Response(JSON.stringify({ error: "UUID required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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

    // If request comes from chat page, skip token validation
    if (source === "chat") {
      console.log("⇠  success (chat bypass)", { uuid });
      return new Response(
        JSON.stringify({
          report_content: data.report_content,
          swiss_data: data.swiss_data,
          metadata: data.metadata,
          uuid,
          chat_hash: data.chat_hash,
          success: true,
        }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    /* -------- TOKEN FLOW (for non-chat requests) -------- */
if (!token) {
  // Always generate a fresh token when the caller has none
  const newToken = genToken();
  const newHash  = await sha256(newToken);

  await supabase.from("temp_report_data")
    .update({ token_hash: newHash })
    .eq("id", uuid);

  console.log("⇠  success", { uuid, firstTime: true });
  return new Response(
    JSON.stringify({ uuid, token: newToken, first_time: true }),
    { headers: { ...cors, "Content-Type": "application/json" } },
  );
}

/* from here on we have a token, so validate it */
if (await sha256(token) !== data.token_hash) {
  console.warn("token mismatch", { uuid, receivedHash: await sha256(token), storedHash: data.token_hash });
  return new Response(JSON.stringify({ error: "Invalid token" }), {
    status: 403, headers: { ...cors, "Content-Type": "application/json" },
  });
}

/* -------- SUCCESS -------- */
console.log("⇠  success", { uuid, firstTime: false });
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
});
