
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper function to log to admin_logs table
async function logToAdminTable(supabase, message, level = 'info', data = {}) {
  try {
    await supabase.rpc('log_admin_event', {
      _page: 'refresh-zoho-token',
      _event_type: 'zoho_token_refresh',
      _logs: `[${level.toUpperCase()}] ${message}`,
      _user_id: null,
      _meta: {
        timestamp: new Date().toISOString(),
        level,
        function: 'refresh-zoho-token',
        ...data
      }
    });
  } catch (logError) {
    // Fallback to console if logging to table fails
    console.error("Error logging to admin_logs table:", logError);
  }
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Log function start with distinctive message
    console.log("=== ZOHO TOKEN REFRESH STARTED ===");
    await logToAdminTable(supabase, "Zoho token refresh process started", 'info');

    const ZOHO_CLIENT_ID = "1000.R14Q1X8904D8KOT7INJRMUWSZQ9S5K";
    const ZOHO_CLIENT_SECRET = Deno.env.get("ZOHO_PASSWORD");

    if (!ZOHO_CLIENT_SECRET) {
      const errorMsg = "Missing Zoho client secret";
      console.error(errorMsg);
      await logToAdminTable(supabase, errorMsg, 'error', { 
        error: 'configuration_error',
        details: 'ZOHO_PASSWORD environment variable is not set'
      });
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
      const errorMsg = "Failed to load refresh token";
      console.error(errorMsg, fetchError);
      await logToAdminTable(supabase, errorMsg, 'error', { 
        error: fetchError,
        details: 'Error retrieving token from database'
      });
      return new Response("Failed to load refresh token", { status: 500 });
    }

    await logToAdminTable(supabase, "Retrieved refresh token", 'debug', {
      tokenId: tokenRow.id
    });

    // Call Zoho to refresh the access token
    const params = new URLSearchParams({
      refresh_token: tokenRow.refresh_token,
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      grant_type: "refresh_token"
    });

    console.log("Refreshing Zoho token...");
    await logToAdminTable(supabase, "Requesting new access token from Zoho", 'info');
    
    const zohoRes = await fetch("https://accounts.zoho.com/oauth/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });

    const json = await zohoRes.json();

    // Log detailed response from Zoho
    const responseLogData = {
      status: zohoRes.status,
      statusText: zohoRes.statusText,
      success: zohoRes.ok,
      hasAccessToken: !!json.access_token,
      errorDetails: !zohoRes.ok ? json : undefined
    };

    if (!zohoRes.ok || !json.access_token) {
      const errorMsg = "Zoho refresh failed";
      console.error(errorMsg, json);
      await logToAdminTable(supabase, errorMsg, 'error', responseLogData);
      return new Response("Failed to refresh token", { status: 500 });
    }

    // Update the DB with the new token and expiry
    const expires_at = new Date(Date.now() + json.expires_in * 1000).toISOString();

    console.log("Token refreshed successfully, updating database...");
    await logToAdminTable(supabase, "Token refreshed successfully", 'info', {
      expires_at,
      expiresInSeconds: json.expires_in
    });

    const { error: updateError } = await supabase
      .from("zoho_tokens")
      .update({
        access_token: json.access_token,
        expires_at
      })
      .eq("id", tokenRow.id);

    if (updateError) {
      const errorMsg = "Failed to update token in database";
      console.error(errorMsg, updateError);
      await logToAdminTable(supabase, errorMsg, 'error', { 
        error: updateError,
        tokenId: tokenRow.id
      });
      return new Response("Failed to update token", { status: 500 });
    }

    // Log successful completion
    const successMsg = "Zoho token refresh completed successfully";
    console.log(successMsg);
    await logToAdminTable(supabase, successMsg, 'info', {
      tokenId: tokenRow.id,
      expiresAt: expires_at
    });

    return new Response("Token refreshed successfully", { status: 200 });
  } catch (error) {
    // Handle unexpected errors
    const errorMsg = `Unexpected error refreshing token: ${error.message}`;
    console.error(errorMsg, error);
    
    // Try to log to admin logs if possible
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await logToAdminTable(supabase, errorMsg, 'error', { 
        stack: error.stack,
        message: error.message
      });
    } catch (logError) {
      console.error("Failed to log error to admin_logs", logError);
    }
    
    return new Response(`Unexpected error: ${error.message}`, { status: 500 });
  }
});
