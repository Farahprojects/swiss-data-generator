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

  let newEmail = "";
  try {
    const body = await req.json();
    newEmail = (body.email ?? "").toLowerCase();
    log("Parsed request:", { newEmail });
  } catch {
    return respond(400, { error: "Invalid JSON" });
  }

  if (!newEmail) return respond(400, { error: "Email required" });

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const smtpEndpoint = Deno.env.get("THERIA_SMTP_ENDPOINT");
  if (!url || !key || !smtpEndpoint) {
    return respond(500, { error: "Missing environment variables" });
  }
  const supabase = createClient(url, key);

  let user: any = null;
  let error: any = null;

  try {
    const { data, error: listErr } = await supabase.auth.admin.listUsers({ email: newEmail });
    error = listErr;
    user = data?.users?.[0] ?? null;
  } catch (e) {
    error = e as Error;
  }

  if (error) {
    log("User lookup failed:", error.message);
    return respond(500, { error: "User lookup failed", details: error.message });
  }

  if (user) {
    return respond(200, { status: "user_exists", message: "Email already in use" });
  }

  let tokenLink = "";
  let emailOtp = "";
  const redirectTo = "https://www.theraiapi.com/auth/email";

  try {
    const { data: linkData, error: tokenErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: newEmail,
      options: { redirectTo },
    });

    if (tokenErr) {
      log("Token generation failed:", tokenErr.message);
      return respond(500, { error: "Token generation failed", details: tokenErr.message });
    }

    log("linkData >>>", JSON.stringify(linkData, null, 2));
    log("Top-level action_link:", linkData?.action_link);
    log("Nested properties.action_link:", linkData?.properties?.action_link);

    tokenLink = linkData?.action_link || linkData?.properties?.action_link || "";
    const props = (linkData as any)?.properties ?? {};
    emailOtp = props.email_otp ?? (linkData as any)?.email_otp ?? "";

    if (!tokenLink) {
      log("Missing action_link in Supabase response. Full linkData:", linkData);
      return respond(500, {
        error: "Missing action_link in token generation",
        details: linkData
      });
    }

    tokenLink += `&email=${encodeURIComponent(newEmail)}`;
    log("Using raw action_link for tokenLink with email param");
  } catch (err: any) {
    log("Link generation error:", err.message);
    return respond(500, { error: "Link generation failed", details: err.message });
  }

  const { data: templateData, error: templateErr } = await supabase
    .from("token_emails")
    .select("subject, body_html")
    .eq("template_type", "magiclink")
    .single();

  if (templateErr || !templateData) {
    log("Template fetch failed:", templateErr?.message);
    return respond(500, { error: "Template fetch failed", details: templateErr?.message });
  }

  const html = templateData.body_html
    .replace(/\{\{\s*\.Link\s*\}\}/g, tokenLink)
    .replace(/\{\{\s*\.OTP\s*\}\}/g, emailOtp);

  log("Sending magiclink e-mail to:", newEmail);

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
    log("SMTP error:", errTxt);
    return respond(500, { error: "Email sending failed", details: errTxt });
  }

  log("✔ Sent magiclink e-mail to", newEmail);
  return respond(200, { status: "sent", template_type: "magiclink" });
});
