// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
  Edge Function: resend-email-change
  ---------------------------------
  Regenerates a fresh *email_change_new* link for a user whose email
  address is in the middle of a change and sends it with your own
  SMTP handler.

  Expected JSON body (all fields required):
    {
      "user_id": "<uuid>",
      "current_email": "old@example.com",
      "new_email": "new@example.com"
    }
*/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS pre‑flight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  const log = (...args: unknown[]) =>
    console.log(`[EMAIL‑CHANGE:${requestId}]`, ...args);

  /* ---------- 1 · Parse & validate body ---------- */
  let userId: string, currentEmail: string, newEmail: string;
  try {
    const { user_id, current_email, new_email } = await req.json();
    userId = user_id ?? "";
    currentEmail = (current_email ?? "").toLowerCase();
    newEmail = (new_email ?? "").toLowerCase();
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  if (!userId || !currentEmail || !newEmail) {
    return json(
      { error: "user_id, current_email and new_email are required" },
      400,
    );
  }

  if (currentEmail === newEmail) {
    return json(
      { error: "new_email must be different to current_email" },
      400,
    );
  }

  /* ---------- 2 · Initialise admin Supabase client ---------- */
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const SMTP_ENDPOINT = Deno.env.get("THERIA_SMTP_ENDPOINT") ?? "";
  const REDIRECT_TO =
    Deno.env.get("EMAIL_CHANGE_REDIRECT") ??
    "https://www.theraiapi.com/auth/email";

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SMTP_ENDPOINT) {
    return json({ error: "Missing environment variables" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  /* ---------- 3 · Generate fresh email‑change token ---------- */
  const { data: linkData, error: linkErr } = await supabase.auth.admin
    .generateLink({
      type: "email_change_new", // send ONLY to the new address (secure email change OFF)
      email: currentEmail,
      newEmail,
      options: { redirectTo: REDIRECT_TO },
    });

  if (linkErr) {
    log("generateLink failed:", linkErr.message);
    return json(
      { error: "Token generation failed", details: linkErr.message },
      500,
    );
  }

  const tokenLink =
    linkData?.action_link ?? (linkData as any)?.properties?.action_link ?? "";
  const emailOtp =
    (linkData as any)?.email_otp ?? (linkData as any)?.properties?.email_otp ?? "";

  if (!tokenLink) {
    return json({ error: "No action_link returned" }, 500);
  }

  /* ---------- 4 · Load HTML template ---------- */
  const { data: template, error: templateErr } = await supabase
    .from("token_emails")
    .select("subject, body_html")
    .eq("template_type", "email_change")
    .single();

  if (templateErr || !template) {
    return json(
      { error: "Template fetch failed", details: templateErr?.message },
      500,
    );
  }

  const html = template.body_html
    .replace(/\{\{\s*\.Link\s*\}\}/g, tokenLink)
    .replace(/\{\{\s*\.OTP\s*\}\}/g, emailOtp);

  /* ---------- 5 · Fire off SMTP send ---------- */
  const smtpRes = await fetch(SMTP_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: newEmail,
      subject: template.subject,
      html,
      from: "Theria Astro <no-reply@theraiastro.com>",
    }),
  });

  if (!smtpRes.ok) {
    const detail = await smtpRes.text();
    log("SMTP failed:", detail);
    return json({ error: "Email send failed", details: detail }, 500);
  }

  log(`✅ Sent email_change_new to ${newEmail}`);
  return json({ status: "sent" });

  /* ---------- util ---------- */
  function json(body: Record<string, unknown>, status = 200) {
    log("Respond:", status, body);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
