
import { serve } from "https://deno.land/std/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { NatalArgs, toSwissNatal } from "../_shared/translator.ts";

const SWISS = Deno.env.get("SWISS_EPHEMERIS_URL")!;  // Using the correct secret key
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/* ── incoming payload ───────────────────────────── */
const ReturnArgs = NatalArgs.extend({
  type: z.enum(["solar", "lunar", "saturn", "jupiter"]),
  year: z.number().int().min(1900).max(2100).optional(),
});
type ReturnPayload = z.infer<typeof ReturnArgs>;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const aiBody: ReturnPayload = ReturnArgs.parse(await req.json());
    
    const swissBody = {
      ...toSwissNatal(aiBody),
      type: aiBody.type,
      year: aiBody.year,
    };

    console.log("Forwarding request to Swiss API:", JSON.stringify(swissBody));
    
    const r = await fetch(`${SWISS}/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(swissBody),
    });
    
    if (!r.ok) {
      console.error("Error from Swiss API:", await r.text());
      throw new Error(`Swiss API returned ${r.status}: ${await r.text()}`);
    }

    const responseText = await r.text();
    console.log("Successful response received from Swiss API");
    
    return new Response(responseText, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error processing request:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
