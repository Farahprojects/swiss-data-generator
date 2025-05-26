// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
  Edge Function · resend-email-change (secure‑email‑change = OFF)
  --------------------------------------------------------------
  1. Accepts `{ user_id }` (old/new emails optional but ignored).
  2. Loads the user row to discover:
       • current primary email  (auth.users.email)
       • pending email change   (auth.users.email_change)
  3. Validates:
       • a pending email exists
       • no other account currently uses that address (primary or pending)
  4. Calls `generateLink('email_change_new')` with those exact addresses.
  5. Builds HTML from the `token_emails` table and POSTs it to your SMTP endpoint.
  6. Emits verbose logs so you can trace every step.
*/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const reqId = crypto.randomUUID().slice(0, 8);
  const log = (...a: unknown[]) => console.log(`[EMAIL-CHANGE:${reqId}]`, ...a);

  /* ---------- 1 · Parse body ---------- */
  let userId = "";
  try {
    ({ user_id: userId = "" } = await req.json());
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  if (!userId) return json({ error: "user_id is required" }, 400);

  /* ---------- 2 · Init admin client ---------- */
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const SMTP_ENDPOINT = Deno.env.get("THERIA_SMTP_ENDPOINT") ?? "";
  const REDIRECT_TO =
    Deno.env.get("EMAIL_CHANGE_REDIRECT") ??
    "https://www.theraiapi.com/auth/email";

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SMTP_ENDPOINT) {
    return json({ error: "Missing environment variables" }, 500);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  /* ---------- 3 · Load user & verify pending change ---------- */
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(userId);
  if (userErr || !userData?.user) {
    log("getUserById failed", userErr?.message);
    return json({ error: "User not found", details: userErr?.message }, 404);
  }

  const u = userData.user as any; // meta fields live on the root for GoTrue <2.0
  const currentEmail = u.email?.toLowerCase();
  const pendingEmail = u.email_change?.toLowerCase();

  log("DB snapshot", {
    currentEmail,
    pendingEmail,
    email_change_token_new: u.email_change_token_new,
    email_change_sent_at: u.email_change_sent_at,
  });

  if (!pendingEmail) return json({ error: "No pending email change" }, 400);

  /* ---------- 4 · Ensure pendingEmail is unique ---------- */
  const { data: dup } = await admin
    .from("auth.users")
    .select("id")
    .or(`email.eq.${pendingEmail},email_change.eq.${pendingEmail}`)
    .neq("id", u.id)
    .limit(1)
    .maybeSingle();

  if (dup) return json({ error: "Address already used by another account" }, 409);

  /* ---------- 5 · Generate fresh token ---------- */
  log("Calling generateLink", { type: "email_change_new", currentEmail, pendingEmail });

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "email_change_new",
    email: currentEmail,
    newEmail: pendingEmail,
    options: { redirectTo: REDIRECT_TO },
  });

  if (linkErr) {
    log("generateLink failed", linkErr.message);
    return json({ error: "Token generation failed", details: linkErr.message }, 500);
  }

  const tokenLink = linkData?.action_link ?? (linkData as any)?.properties?.action_link ?? "";
  const emailOtp = (linkData as any)?.email_otp ?? (linkData as any)?.properties?.email_otp ?? "";

  log("New token", { tokenLink, emailOtp });
  if (!tokenLink) return json({ error: "No action_link returned" }, 500);

  /* ---------- 6 · Prepare email body ---------- */
  const { data: tpl, error: tplErr } = await admin
    .from("token_emails")
    .select("subject, body_html")
    .eq("template_type", "email_change")
    .single();

  if (tplErr || !tpl) return json({ error: "Template not found", details: tplErr?.message }, 500);

  const html = tpl.body_html
    .replace(/\{\{\s*\.Link\s*\}\}/g, tokenLink)
    .replace(/\{\{\s*\.OTP\s*\}\}/g, emailOtp);

  /* ---------- 7 · Send email via SMTP handler ---------- */
  const smtpRes = await fetch(SMTP_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: pendingEmail,
      subject: tpl.subject,
      html,
      from: "Theria Astro <no-reply@theraiastro.com>",
    }),
  });

  if (!smtpRes.ok) {
    const detail = await smtpRes.text();
    log("SMTP send failed", detail);
    return json({ error: "Email send failed", details: detail }, 500);
  }

  log(`✅ Sent email_change_new to ${pendingEmail}`);
  return json({ status: "sent" });

  /* ---------- util ---------- */
  function json(body: Record<string, unknown>, status = 200) {
    log("Respond", status, body);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
