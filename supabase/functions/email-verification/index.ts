// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*
  Edge Function · resend-email-change (secure-email-change = OFF)
  --------------------------------------------------------------
  ➤ Accepts `{ user_id }` (ignore emails from payload).
  ➤ Pulls current & pending emails from auth.users.
  ➤ If a pending email exists, mint a fresh `email_change_new` link
    and send it via your SMTP handler.
  ➤ Full verbose logs at every stage.
*/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const id = crypto.randomUUID().slice(0, 8);
  const log = (...a: unknown[]) => console.log(`[EMAIL-CHANGE:${id}]`, ...a);

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

  /* ---------- 3 · Load user ---------- */
  const { data: user, error: userErr } = await admin.auth.admin.getUserById(userId);
  if (userErr || !user) {
    log("getUserById failed", userErr?.message);
    return json({ error: "User not found", details: userErr?.message }, 404);
  }

  const currentEmail = user.email?.toLowerCase();
  const pendingEmail = (user as any).email_change?.toLowerCase(); // GoTrue stores it at root

  log("DB snapshot", {
    currentEmail,
    pendingEmail,
    email_change_token_new: (user as any).email_change_token_new,
    email_change_sent_at: (user as any).email_change_sent_at,
  });

  if (!pendingEmail) return json({ error: "No pending email change" }, 400);

  /* ---------- 4 · Mint fresh token ---------- */
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

  /* ---------- 5 · Build email from template ---------- */
  const { data: tpl, error: tplErr } = await admin
    .from("token_emails")
    .select("subject, body_html")
    .eq("template_type", "email_change")
    .single();

  if (tplErr || !tpl) return json({ error: "Template not found", details: tplErr?.message }, 500);

  const html = tpl.body_html
    .replace(/\{\{\s*\.Link\s*\}\}/g, tokenLink)
    .replace(/\{\{\s*\.OTP\s*\}\}/g, emailOtp);

  /* ---------- 6 · Send via SMTP handler ---------- */
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
