
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const log = (msg: string, ...args: any[]) =>
    console.log(`[SIGNUP-CONFIRM:${requestId}] ${msg}`, ...args);

  function respond(status: number, body: Record<string, any>) {
    log("Responding:", status, body);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  let userId = "";
  try {
    const body = await req.json();
    userId = body.user_id ?? "";
    log("Parsed request:", { userId });
  } catch {
    return respond(400, { error: "Invalid JSON" });
  }

  if (!userId) {
    return respond(400, { error: "user_id is required" });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const smtpEndpoint = Deno.env.get("THERIA_SMTP_ENDPOINT");

  if (!url || !key || !smtpEndpoint) {
    return respond(500, { error: "Missing environment variables" });
  }

  const supabase = createClient(url, key);
  const redirectTo = "https://www.theraiapi.com/auth/email";
  let tokenLink = "";
  let emailOtp = "";
  let userEmail = "";

  try {
    const { data: userData, error: fetchErr } = await supabase.auth.admin.getUserById(userId);

    if (fetchErr || !userData?.user) {
      return respond(500, { error: "Failed to fetch user", details: fetchErr?.message });
    }

    log("Full user object:", JSON.stringify(userData, null, 2));
    userEmail = userData.user.email;

    if (!userEmail) {
      return respond(400, {
        error: "User does not have a valid email",
        user: userData,
      });
    }
  } catch (e: any) {
    return respond(500, { error: "Error fetching user data", details: e.message });
  }

  try {
    const { data: linkData, error: tokenErr } = await supabase.auth.admin.generateLink({
      type: "signup",
      email: userEmail,
      options: { redirectTo },
    });

    if (tokenErr) {
      log("Token generation failed:", tokenErr.message);
      return respond(500, { error: "Token generation failed", details: tokenErr.message });
    }

    tokenLink = linkData?.action_link || linkData?.properties?.action_link || "";
    const props = (linkData as any)?.properties ?? {};
    emailOtp = props.email_otp ?? (linkData as any)?.email_otp ?? "";

    if (!tokenLink) {
      return respond(500, {
        error: "Missing action_link in token generation",
        details: linkData,
      });
    }

    tokenLink += `&email=${encodeURIComponent(userEmail)}`;
    log("Final tokenLink:", tokenLink);
  } catch (err: any) {
    return respond(500, { error: "Link generation failed", details: err.message });
  }

  const { data: templateData, error: templateErr } = await supabase
    .from("token_emails")
    .select("subject, body_html")
    .eq("template_type", "signup_confirmation")
    .single();

  if (templateErr || !templateData) {
    return respond(500, { error: "Template fetch failed", details: templateErr?.message });
  }

  const html = templateData.body_html
    .replace(/\{\{\s*\.Link\s*\}\}/g, tokenLink)
    .replace(/\{\{\s*\.OTP\s*\}\}/g, emailOtp);

  const send = await fetch(smtpEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: userEmail,
      subject: templateData.subject,
      html,
      from: "Theria Astro <no-reply@theraiastro.com>",
    }),
  });

  if (!send.ok) {
    const errTxt = await send.text();
    return respond(500, { error: "Email sending failed", details: errTxt });
  }

  log(`✔ Sent signup confirmation to ${userEmail}`);
  return respond(200, { status: "sent", template_type: "signup_confirmation" });
});
