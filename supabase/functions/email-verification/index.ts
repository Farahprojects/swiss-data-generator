
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

  /* ---------- helper ---------- */
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

  /* ---------- 1 · parse body ---------- */
  let email = "";
  let templateType = "";
  try {
    const body = await req.json();
    email = (body.email ?? "").toLowerCase();
    templateType = body.template_type ?? "email_change_new";
    log("Parsed request:", { email, templateType });
  } catch {
    return respond(400, { error: "Invalid JSON" });
  }

  if (!email) return respond(400, { error: "Email required" });
  if (
    ![
      "email_change_new",
      "email_change_current",
      "password_reset",
      "signup_confirmation",
    ].includes(templateType)
  ) {
    return respond(400, { error: "Invalid template_type" });
  }

  /* ---------- 2 · supabase admin ---------- */
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const smtpEndpoint = Deno.env.get("THERIA_SMTP_ENDPOINT");
  if (!url || !key || !smtpEndpoint) {
    return respond(500, { error: "Missing environment variables" });
  }
  const supabase = createClient(url, key);

  /* ---------- 3 · fetch user ---------- */
  let user: any = null;
  let error: any = null;

  try {
    // works in every 2.x release
    const { data, error: listErr } = await supabase.auth.admin.listUsers({ email });
    error = listErr;
    user  = data?.users?.[0] ?? null;
  } catch (e) {
    error = e as Error;
  }

  if (error) {
    log("User lookup failed:", error.message);
    return respond(500, { error: "User lookup failed", details: error.message });
  }
  if (!user) return respond(200, { status: "no_user_found" });

  /* ---------- 4 · generate link ---------- */
  let tokenLink = "";
  let emailOtp = "";
  const redirectTo = "https://www.theraiapi.com/auth/email";
  const needsChange =
    templateType === "email_change_new" || templateType === "email_change_current";

  try {
    let linkData, tokenErr;

    if (needsChange) {
      // For email_change_new, use the new_email if available, otherwise use the email from request
      const targetEmail = templateType === "email_change_new" 
        ? (user.new_email || email)
        : user.email;

      if (templateType === "email_change_new" && !user.new_email) {
        // If no pending email change but we're asked for new email verification,
        // this might be a direct verification request
        log("No pending email change found, treating as direct verification");
      }

      ({ data: linkData, error: tokenErr } =
        await supabase.auth.admin.generateLink({
          type: templateType as "email_change_new",
          email: user.email,
          newEmail: templateType === "email_change_new" ? (user.new_email || email) : undefined,
          options: { redirectTo },
        }));
    } else if (templateType === "password_reset") {
      ({ data: linkData, error: tokenErr } =
        await supabase.auth.admin.generateLink({
          type: "recovery",
          email: user.email,
          options: { redirectTo: "https://www.theraiapi.com/auth/password" },
        }));
    } else {
      ({ data: linkData, error: tokenErr } =
        await supabase.auth.admin.generateLink({
          type: "signup",
          email: user.email,
          options: { redirectTo },
        }));
    }

    if (tokenErr) {
      log("Token generation failed:", tokenErr.message);
      return respond(500, { error: "Token generation failed", details: tokenErr.message });
    }

    log("linkData >>>", JSON.stringify(linkData, null, 2));

    tokenLink = linkData?.action_link ?? "";

    // SDK ≥2.39 puts everything under `properties`
    const props = (linkData as any)?.properties ?? {};
    const tokenHash = props.hashed_token ?? (linkData as any)?.hashed_token;
    emailOtp = props.email_otp ?? (linkData as any)?.email_otp ?? "";

    /* ---- Build application link with fragment instead of query params ---- */
    if (tokenHash) {
      // supabase v2.40+ returns the canonical enum here:
      // signup • email_change_token_new • email_change_token_current • recovery …
      const actualTokenType =
        (linkData as any).token_type   // preferred (present on ≥2.40)
        ?? (linkData as any).type      // fallback (older SDK shape)
        ?? templateType;               // final fallback – what you asked for

      tokenLink =
        `https://www.theraiapi.com/auth/email` +
        `#token_hash=${tokenHash}` +
        `&type=${actualTokenType}`;
    }
  } catch (err: any) {
    log("Link generation error:", err.message);
    return respond(500, { error: "Link generation failed", details: err.message });
  }

  /* ---------- 5 · fetch template ---------- */
  const { data: templateData, error: templateErr } = await supabase
    .from("token_emails")
    .select("subject, body_html")
    .eq(
      "template_type",
      needsChange ? "email_change" : templateType,
    )
    .single();

  if (templateErr || !templateData) {
    log("Template fetch failed:", templateErr?.message);
    return respond(500, { error: "Template fetch failed", details: templateErr?.message });
  }

  /* ---------- 6 · send mail ---------- */
  const targetEmail = templateType === "email_change_new" 
    ? (user.new_email || email)  // Send to new email for verification
    : user.email;                 // Send to current email for notifications

  const html = templateData.body_html
    .replace(/\{\{\s*\.Link\s*\}\}/g, tokenLink)
    .replace(/\{\{\s*\.OTP\s*\}\}/g, emailOtp);

  log(`Sending ${templateType} e-mail to:`, targetEmail);

  const send = await fetch(smtpEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: targetEmail,
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

  log(`✔ Sent ${templateType} e-mail to`, targetEmail);
  return respond(200, { status: "sent", template_type: templateType });
});
