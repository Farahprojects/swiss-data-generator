
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ZOHO_CLIENT_ID = "1000.4EOF0Y4Q4OMBYTX8JSQHU2KTZW2JJY";
    const ZOHO_CLIENT_SECRET = Deno.env.get("ZOHO_PASSWORD");

    if (!ZOHO_CLIENT_SECRET) {
      console.error("Missing Zoho client secret");
      return new Response("Missing Zoho client secret", { status: 500 });
    }

    // Fetch the stored refresh token
    const { data: tokenRow, error: fetchError } = await supabase
      .from("zoho_tokens")
      .select("id, refresh_token")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !tokenRow) {
      console.error("Failed to load refresh token", fetchError);
      return new Response("Failed to load refresh token", { status: 500 });
    }

    // Call Zoho to refresh the access token
    const params = new URLSearchParams({
      refresh_token: tokenRow.refresh_token,
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      grant_type: "refresh_token"
    });

    console.log("Refreshing Zoho token...");
    const zohoRes = await fetch("https://accounts.zoho.com/oauth/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });

    const json = await zohoRes.json();

    if (!zohoRes.ok || !json.access_token) {
      console.error("Zoho refresh failed", json);
      return new Response("Failed to refresh token", { status: 500 });
    }

    // Update the DB with the new token and expiry
    const expires_at = new Date(Date.now() + json.expires_in * 1000).toISOString();

    console.log("Token refreshed successfully, updating database...");
    const { error: updateError } = await supabase
      .from("zoho_tokens")
      .update({
        access_token: json.access_token,
        expires_at
      })
      .eq("id", tokenRow.id);

    if (updateError) {
      console.error("Failed to update token", updateError);
      return new Response("Failed to update token", { status: 500 });
    }

    console.log("Zoho token refresh completed successfully");
    return new Response("Token refreshed successfully", { status: 200 });
  } catch (error) {
    console.error("Unexpected error refreshing token:", error);
    return new Response(`Unexpected error: ${error.message}`, { status: 500 });
  }
});
