// deno-lint-ignore-file no-explicit-any10
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  let userId = "";
  let newEmail = "";
  let currentEmail = "";
  try {
    const body = await req.json();
    userId = body.user_id ?? "";
    newEmail = (body.new_email ?? "").toLowerCase();
    currentEmail = (body.current_email ?? "").toLowerCase();
    log("Parsed request:", { userId, newEmail, currentEmail });
  } catch {
    return respond(400, { error: "Invalid JSON" });
  }

  if (!userId || !newEmail || !currentEmail) {
    return respond(400, { error: "user_id, new_email, and current_email are required" });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const smtpEndpoint = Deno.env.get("THERIA_SMTP_ENDPOINT");
  if (!url || !key || !smtpEndpoint) {
    return respond(500, { error: "Missing environment variables" });
  }
  const supabase = createClient(url, key);

  try {
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      email: currentEmail,
      new_email: newEmail,
    });

    if (updateErr) {
      log("User update failed:", updateErr.message);
      return respond(500, { error: "Failed to set new email", details: updateErr.message });
    }
  } catch (err: any) {
    return respond(500, { error: "Update user failed", details: err.message });
  }

  let tokenLink = "";
  let emailOtp = "";
  const redirectTo = "https://www.theraiapi.com/auth/email";

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

    log("linkData >>>", JSON.stringify(linkData, null, 2));
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

  log(`✔ Sent email_change e-mail to ${newEmail}`);
  return respond(200, { status: "sent", template_type: "email_change" });
});
