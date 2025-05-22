import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { data: secrets, error } = await supabase
      .from("secure_config")
      .select("value")
      .eq("key", "ZOHO_SECRET")
      .single();

    if (error || !secrets) {
      console.error("Failed to load Zoho secret:", error);
      return new Response(JSON.stringify({ error: "Missing Zoho secret" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const refresh_token = Deno.env.get("ZOHO_REFRESH_TOKEN");
    const client_id = Deno.env.get("ZOHO_CLIENT_ID");
    const client_secret = secrets.value;

    const form = new URLSearchParams();
    form.append("refresh_token", refresh_token!);
    form.append("client_id", client_id!);
    form.append("client_secret", client_secret);
    form.append("grant_type", "refresh_token");

    const res = await fetch("https://accounts.zoho.com.au/oauth/v2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Zoho token refresh failed:", result);
      return new Response(JSON.stringify({ error: "Failed to refresh token", details: result }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const { access_token, expires_in, api_domain } = result;

    // Save new access token to Supabase table "zoho_tokens"
    const { error: updateError } = await supabase
      .from("zoho_tokens")
      .upsert({
        id: "default",
        access_token,
        expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        api_domain,
      });

    if (updateError) {
      console.error("Error saving new token:", updateError);
      return new Response(JSON.stringify({ error: "Token saved failed", details: updateError }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ success: true, access_token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Unexpected failure", details: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
