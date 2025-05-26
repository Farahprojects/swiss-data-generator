// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
  Edge Function: resend-email-change
  ---------------------------------
  ➤ Accepts user_id, current_email, new_email
  ➤ Generates a fresh *email_change_new* link (secure‑email‑change OFF)
  ➤ Sends the link with your custom SMTP handler
  ➤ Emits detailed diagnostic logs so you can trace exactly
    • the payload received
    • which email GoTrue checked for a pending change
    • the values found in auth.users.*email_change* columns
*/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS pre‑flight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const id = crypto.randomUUID().slice(0, 8);
  const log = (...a: unknown[]) => console.log(`[EMAIL-CHANGE:${id}]`, ...a);

  /* ---------- 1 · Parse & validate JSON ---------- */
  let userId = "";
  let currentEmail = "";
  let newEmail = "";

  try {
    const { user_id, current_email, new_email } = await req.json();
    userId = user_id ?? "";
    currentEmail = (current_email ?? "").toLowerCase();
    newEmail = (new_email ?? "").toLowerCase();
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  log("Payload received", { userId, currentEmail, newEmail });

  if (!userId || !currentEmail || !newEmail) {
    return json(
      { error: "user_id, current_email and new_email are required" },
      400,
    );
  }
  if (currentEmail === newEmail) {
    return json({ error: "new_email must differ from current_email" }, 400);
  }

  /* ---------- 2 · Init admin Supabase client ---------- */
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const SMTP_ENDPOINT = Deno.env.get("THERIA_SMTP_ENDPOINT") ?? "";
  const REDIRECT_TO =
    Deno.env.get("EMAIL_CHANGE_REDIRECT") ??
    "https://www.theraiapi.com/auth/email";

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !SMTP_ENDPOINT) {
    return json({ error: "Missing env vars" }, 500);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  /* ---------- 3 · Inspect existing user record ---------- */
  const { data: userData, error: fetchErr } = await supabase.auth.admin.getUserById(
    userId,
  );
  if (fetchErr || !userData) {
    log("getUserById error", fetchErr?.message);
    return json({ error: "Failed to load user", details: fetchErr?.message }, 500);
  }

  const {
    email: dbEmail,
    email_change: dbEmailChange,
    email_change_token_new,
    email_change_sent_at,
  } = userData.user_metadata ? { ...userData } : (userData as any);

  log("DB snapshot", {
    email: dbEmail,
    email_change: dbEmailChange,
    email_change_token_new,
    email_change_sent_at,
  });

  /* ---------- 4 · Generate fresh token ---------- */
  log("Calling generateLink", {
    type: "email_change_new",
    email: currentEmail,
    newEmail,
  });

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "email_change_new", // goes ONLY to new email because secure change is off
    email: currentEmail, // current (old) email is the identifier GoTrue looks at
    newEmail,
    options: { redirectTo: REDIRECT_TO },
  });

  if (linkErr) {
    log("generateLink failed", linkErr.message);
    return json({ error: "Token generation failed", details: linkErr.message }, 500);
  }

  const tokenLink =
    linkData?.action_link ?? (linkData as any)?.properties?.action_link ?? "";
  const emailOtp =
    (linkData as any)?.email_otp ?? (linkData as any)?.properties?.email_otp ?? "";

  log("New token details", { tokenLink, emailOtp });

  if (!tokenLink) return json({ error: "No action_link returned" }, 500);

  /* ---------- 5 · Build email body ---------- */
  const { data: tpl, error: tplErr } = await supabase
    .from("token_emails")
    .select("subject, body_html")
    .eq("template_type", "email_change")
    .single();

  if (tplErr || !tpl) {
    log("Template fetch failed", tplErr?.message);
    return json({ error: "Email template not found", details: tplErr?.message }, 500);
  }

  const html = tpl.body_html
    .replace(/\{\{\s*\.Link\s*\}\}/g, tokenLink)
    .replace(/\{\{\s*\.OTP\s*\}\}/g, emailOtp);

  /* ---------- 6 · Send via SMTP handler ---------- */
  const smtpRes = await fetch(SMTP_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: newEmail,
      subject: tpl.subject,
      html,
      from: "Theria Astro <no-reply@theraiastro.com>",
    }),
  });

  if (!smtpRes.ok) {
    const detail = await smtpRes.text();
    log("SMTP failed", detail);
    return json({ error: "Email send failed", details: detail }, 500);
  }

  log(`✅ Sent email_change_new to ${newEmail}`);
  return json({ status: "sent" });

  /* --- util --- */
  function json(body: Record<string, unknown>, status = 200) {
    log("Respond", status, body);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
