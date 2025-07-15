// test 
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { uuid, token } = await req.json();
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

    /* -------- TOKEN FLOW -------- */
    if (!data.token_hash && !token) {
      // first‑time request → create token
      const newToken = genToken();
      await supabase.from("temp_report_data")
        .update({ token_hash: await sha256(newToken) })
        .eq("id", uuid);

      return new Response(JSON.stringify({ uuid, token: newToken, first_time: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!token) {
      return new Response(JSON.stringify({ error: "Token required" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (await sha256(token) !== data.token_hash) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    /* -------- SUCCESS -------- */
    return new Response(JSON.stringify({
      report_content: data.report_content,
      swiss_data: data.swiss_data,
      metadata: data.metadata,
      uuid,
      token,
      chat_hash: data.chat_hash,
      success: true,
    }), { headers: { ...cors, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
