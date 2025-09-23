

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

  let emailOtp = "";
  let customPasswordLink = "";

  try {
    const { data: linkData, error: tokenErr } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: "https://auth.therai.co" },
    });

    if (tokenErr) {
      log("Token generation failed:", tokenErr.message);
      return respond(500, { error: "Token generation failed", details: tokenErr.message });
    }

    // Extract token and OTP from the generated link
    const actionLink = linkData?.action_link || linkData?.properties?.action_link || "";
    const props = (linkData as any)?.properties ?? {};
    emailOtp = props.email_otp ?? (linkData as any)?.email_otp ?? "";

    if (!actionLink) {
      return respond(500, {
        error: "Missing action_link in token generation",
        details: linkData,
      });
    }

    // Parse the Supabase URL to extract the token
    const urlObj = new URL(actionLink);
    const token = urlObj.searchParams.get('token');
    const type = urlObj.searchParams.get('type');

    if (!token || !type) {
      return respond(500, {
        error: "Missing token or type in generated link",
        details: { actionLink, token, type },
      });
    }

    // Build custom password reset link
    customPasswordLink = `https://auth.therai.co?token=${encodeURIComponent(token)}&type=password&email=${encodeURIComponent(email)}`;
    
    log("Custom password link built:", customPasswordLink);
  } catch (err: any) {
    return respond(500, { error: "Link generation failed", details: err.message });
  }

  // Use the standardized email-verification function with password_reset template
  const { error: emailError } = await supabase.functions.invoke('email-verification', {
    body: {
      email: email,
      url: customPasswordLink,
      template_type: "password_reset"
    }
  });

  if (emailError) {
    log("Email sending failed:", emailError.message);
    return respond(500, { error: "Email sending failed", details: emailError.message });
  }

  log(`✔ Sent password reset to ${email}`);
  return respond(200, { status: "sent", template_type: "password_reset" });
});

