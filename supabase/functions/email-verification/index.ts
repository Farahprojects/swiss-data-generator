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
    console.log(`[EMAIL-VERIFICATION:${requestId}] ${msg}`, ...args);

  function respond(status: number, body: Record<string, any>) {
    log("Responding:", status, body);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  let currentEmail = "";
  let newEmail = "";

  try {
    const body = await req.json();
    currentEmail = (body.current_email ?? "").toLowerCase();
    newEmail = (body.new_email ?? "").toLowerCase();
    log("Parsed request:", { currentEmail, newEmail });
  } catch {
    return respond(400, { error: "Invalid JSON" });
  }

  if (!currentEmail || !newEmail) {
    return respond(400, { error: "Both current_email and new_email are required" });
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

  try {
    const { data: linkData, error: tokenErr } = await supabase.auth.admin.generateLink({
      type: "email_change_new",
      email: currentEmail,
      newEmail: newEmail,
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

    tokenLink += `&email=${encodeURIComponent(newEmail)}`;
    log("Final tokenLink:", tokenLink);
  } catch (err: any) {
    return respond(500, { error: "Link generation failed", details: err.message });
  }

  const { data: templateData, error: templateErr } = await supabase
    .from("token_emails")
    .select("subject, body_html")
    .eq("template_type", "email_change")
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
      to: newEmail,
      subject: templateData.subject,
      html,
      from: "Theria Astro <no-reply@theraiastro.com>",
    }),
  });

  if (!send.ok) {
    const errTxt = await send.text();
    return respond(500, { error: "Email sending failed", details: errTxt });
  }

  log(`✔ Resent email_change_new link to ${newEmail}`);
  return respond(200, { status: "sent", template_type: "email_change_new" });
});
