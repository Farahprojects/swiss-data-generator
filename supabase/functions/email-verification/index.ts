
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
    console.log(`[EMAIL-VERIFICATION:${requestId}] ${msg}`, ...args);

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
    log("✓ Request received:", { userId, hasUserId: !!userId });
  } catch (e) {
    log("✗ JSON parsing failed:", e);
    return respond(400, { error: "Invalid JSON" });
  }

  if (!userId) {
    log("✗ Missing user_id parameter");
    return respond(400, { error: "user_id is required" });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const smtpEndpoint = Deno.env.get("THERIA_SMTP_ENDPOINT");

  if (!url || !key || !smtpEndpoint) {
    log("✗ Missing environment variables:", { hasUrl: !!url, hasKey: !!key, hasSmtp: !!smtpEndpoint });
    return respond(500, { error: "Missing environment variables" });
  }

  const supabase = createClient(url, key);
  const redirectTo = "https://therai.co/auth/email";
  let currentEmail = "";
  let newEmail = "";
  let tokenLink = "";
  let emailOtp = "";

  // User data fetching with detailed logging
  try {
    log("→ Fetching user data for:", userId);
    const { data: userData, error: fetchErr } = await supabase.auth.admin.getUserById(userId);

    if (fetchErr || !userData || !userData.user) {
      log("✗ User fetch failed:", { 
        error: fetchErr?.message, 
        hasData: !!userData, 
        hasUser: !!userData?.user 
      });
      return respond(500, { error: "Failed to fetch user", details: fetchErr?.message });
    }

    log("✓ User data fetched successfully");
    log("User object keys:", Object.keys(userData.user));
    log("User email fields:", {
      email: userData.user.email,
      new_email: userData.user.new_email,
      email_confirmed_at: userData.user.email_confirmed_at,
    });

    currentEmail = userData.user.email;
    newEmail = userData.user.new_email;

    if (!currentEmail || !newEmail) {
      log("✗ Missing email data:", {
        hasCurrentEmail: !!currentEmail,
        hasNewEmail: !!newEmail,
        currentEmail: currentEmail || "[MISSING]",
        newEmail: newEmail || "[MISSING]",
      });
      return respond(400, {
        error: "User does not have a pending email change",
        currentEmail,
        newEmail,
        user: userData,
      });
    }

    log("✓ Email change detected:", { 
      from: currentEmail, 
      to: newEmail 
    });
  } catch (e: any) {
    log("✗ Exception during user fetch:", e.message);
    return respond(500, { error: "Error fetching user data", details: e.message });
  }

  // Token generation with detailed logging
  try {
    log("→ Generating email change token");
    log("Token generation params:", {
      type: "email_change_new",
      currentEmail,
      newEmail,
      redirectTo,
    });

    const { data: linkData, error: tokenErr } = await supabase.auth.admin.generateLink({
      type: "email_change_new",
      email: currentEmail,
      newEmail,
      options: { redirectTo },
    });

    if (tokenErr) {
      log("✗ Token generation failed:", {
        message: tokenErr.message,
        code: tokenErr.code,
        status: tokenErr.status,
      });
      return respond(500, { error: "Token generation failed", details: tokenErr.message });
    }

    log("✓ Token generation successful");
    log("Link data structure:", {
      hasActionLink: !!(linkData?.action_link),
      hasProperties: !!(linkData?.properties),
      actionLinkLength: linkData?.action_link?.length || 0,
      keys: Object.keys(linkData || {}),
    });

    tokenLink = linkData?.action_link || linkData?.properties?.action_link || "";
    const props = (linkData as any)?.properties ?? {};
    emailOtp = props.email_otp ?? (linkData as any)?.email_otp ?? "";

    log("Token extraction results:", {
      hasTokenLink: !!tokenLink,
      hasEmailOtp: !!emailOtp,
      tokenLinkLength: tokenLink.length,
      otpLength: emailOtp.length,
    });

    if (!tokenLink) {
      log("✗ Missing action_link in response:", linkData);
      return respond(500, {
        error: "Missing action_link in token generation",
        details: linkData,
      });
    }

    // Link construction
    const originalLink = tokenLink;
    tokenLink += `&email=${encodeURIComponent(newEmail)}`;
    
    log("✓ Link construction complete:", {
      originalLength: originalLink.length,
      finalLength: tokenLink.length,
      addedParam: `email=${encodeURIComponent(newEmail)}`,
    });
    log("Final verification link:", tokenLink);
  } catch (err: any) {
    log("✗ Exception during token generation:", err.message);
    return respond(500, { error: "Link generation failed", details: err.message });
  }

  // Template fetching and processing
  let templateData;
  try {
    log("→ Fetching email template for: email_change");
    const { data, error: templateErr } = await supabase
      .from("token_emails")
      .select("subject, body_html")
      .eq("template_type", "email_change")
      .single();

    if (templateErr || !data) {
      log("✗ Template fetch failed:", {
        error: templateErr?.message,
        hasData: !!data,
      });
      return respond(500, { error: "Template fetch failed", details: templateErr?.message });
    }

    templateData = data;
    log("✓ Template fetched successfully:", {
      subject: templateData.subject,
      htmlLength: templateData.body_html?.length || 0,
    });
  } catch (err: any) {
    log("✗ Exception during template fetch:", err.message);
    return respond(500, { error: "Template processing failed", details: err.message });
  }

  // Template variable substitution
  log("→ Processing template variables");
  const originalHtml = templateData.body_html;
  const html = templateData.body_html
    .replace(/\{\{\s*\.Link\s*\}\}/g, tokenLink)
    .replace(/\{\{\s*\.OTP\s*\}\}/g, emailOtp);

  const linkReplacements = (originalHtml.match(/\{\{\s*\.Link\s*\}\}/g) || []).length;
  const otpReplacements = (originalHtml.match(/\{\{\s*\.OTP\s*\}\}/g) || []).length;

  log("✓ Template processing complete:", {
    linkReplacements,
    otpReplacements,
    originalLength: originalHtml.length,
    processedLength: html.length,
  });

  // Email sending
  try {
    log("→ Sending email via SMTP");
    log("Email details:", {
      to: newEmail,
      subject: templateData.subject,
      htmlLength: html.length,
      smtpEndpoint: new URL(smtpEndpoint).hostname,
    });

    const emailPayload = {
      to: newEmail,
      subject: templateData.subject,
      html,
      from: "Therai <no-reply@therai.co>",
    };

    const send = await fetch(smtpEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailPayload),
    });

    if (!send.ok) {
      const errTxt = await send.text();
      log("✗ SMTP delivery failed:", {
        status: send.status,
        statusText: send.statusText,
        error: errTxt,
      });
      return respond(500, { error: "Email sending failed", details: errTxt });
    }

    const smtpResponse = await send.text();
    log("✓ Email sent successfully:", {
      smtpStatus: send.status,
      responseLength: smtpResponse.length,
      to: newEmail,
    });
  } catch (err: any) {
    log("✗ Exception during email sending:", err.message);
    return respond(500, { error: "Email delivery failed", details: err.message });
  }

  log(`✅ EMAIL CHANGE VERIFICATION COMPLETE: ${currentEmail} → ${newEmail}`);
  return respond(200, { status: "sent", template_type: "email_change_new" });
});
