import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const log = (...args: any[]) => console.log(`[EMAIL-VERIFICATION:${requestId}]`, ...args);
  
  const respond = (status: number, body: any) => 
    new Response(JSON.stringify(body), { 
      status, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let userId = "";
  let tokenLink = "";
  let emailOtp = "";
  let templateType = "email_verification";
  
  try {
    const body = await req.json();
    userId = body.user_id ?? "";
    tokenLink = body.token_link ?? "";
    emailOtp = body.email_otp ?? "";
    templateType = body.template_type ?? "email_verification";
      log("✓ Request received:", { userId, templateType });
  } catch (e) {
    log("✗ JSON parsing failed:", e);
    return respond(400, { error: "Invalid JSON" });
  }

  if (!userId) {
    log("✗ Missing user_id parameter");
    return respond(400, { error: "user_id is required" });
  }

  if (!tokenLink) {
    log("✗ Missing token_link parameter");
    return respond(400, { error: "token_link is required" });
  }

  const url = Deno.env.get("VITE_SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const smtpEndpoint = Deno.env.get("OUTBOUND_SMTP_ENDPOINT");

  if (!url || !key || !smtpEndpoint) {
    log("✗ Missing environment variables:", { hasUrl: !!url, hasKey: !!key, hasSmtp: !!smtpEndpoint });
    return respond(500, { error: "Missing environment variables" });
  }

  const supabase = createClient(url, key);
  let currentEmail = "";

  // Get user email for sending
  try {
    log("→ Fetching user email");
    const { data: userData, error: fetchErr } = await supabase.auth.admin.getUserById(userId);
    
    if (fetchErr || !userData?.user) {
      log("✗ User fetch failed:", fetchErr?.message);
      return respond(500, { error: "Failed to fetch user", details: fetchErr?.message });
    }
    
    currentEmail = userData.user.email;
    
    if (!currentEmail) {
      log("✗ User missing email");
      return respond(400, { error: "User does not have a valid email" });
    }
    
    log("✓ User email confirmed:", currentEmail);
  } catch (e: any) {
    log("✗ Exception during user fetch:", e.message);
    return respond(500, { error: "Error fetching user data", details: e.message });
  }

  // Template fetching and processing
  let templateData;
  try {
    log(`→ Fetching email template for: ${templateType}`);
    const { data, error: templateErr } = await supabase
      .from("email_notification_templates")
      .select("subject, body_html, body_text")
      .eq("template_type", templateType)
      .single();

    if (templateErr || !data) {
      log("✗ Template fetch failed:", {
        error: templateErr?.message,
        hasData: !!data,
      });
      return respond(500, { error: "Template fetch failed", details: templateErr?.message });
    }

    templateData = data;
        log("✓ Template fetched successfully:", { subject: templateData.subject });
  } catch (err: any) {
    log("✗ Exception during template fetch:", err.message);
    return respond(500, { error: "Template processing failed", details: err.message });
  }

  // Template variable substitution
  log("→ Processing template variables");
  const originalHtml = templateData.body_html;
  let html = templateData.body_html;
  
  // For email_verification template, use {{verification_link}} and {{.OTP}}
  if (templateType === "email_verification") {
    html = html
      .replace(/\{\{verification_link\}\}/g, tokenLink)
      .replace(/\{\{\s*\.OTP\s*\}\}/g, emailOtp);
    
    const linkReplacements = (originalHtml.match(/\{\{verification_link\}\}/g) || []).length;
    const otpReplacements = (originalHtml.match(/\{\{\s*\.OTP\s*\}\}/g) || []).length;
    
        log("✓ Template processing complete:", { linkReplacements, otpReplacements });
  }

  // Build VPS-compatible payload
  const payload = {
    slug: "noreply",                    // Hardcoded for verification pipeline
    domain: "therai.co",               // Hardcoded for verification pipeline
    to_email: currentEmail,            // Dynamic: user's email
    subject: templateData.subject,     // Dynamic: from template
    body: html,                        // Dynamic: processed HTML template
    request_id: userId,                // Use auth user ID for correlation
    timestamp: new Date().toISOString() // Dynamic: current timestamp
  };

  // Log final payload being sent to VPS
  log("📧 FINAL PAYLOAD TO VPS:");
  log("============================================");
  log(JSON.stringify(payload, null, 2));
  log("============================================");

  try {
    const send = await fetch(smtpEndpoint, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "User-Agent": "therai-email-verification/1.0"
      },
      body: JSON.stringify(payload),
    });

    if (!send.ok) {
      const errorText = await send.text();
      log("✗ SMTP send failed:", { status: send.status, error: errorText });
      return respond(500, { error: "Email delivery failed", details: errorText });
    }

    log("✓ Email sent successfully via VPS");
  } catch (err: any) {
    log("✗ Exception during email send:", err.message);
    return respond(500, { error: "Email delivery failed", details: err.message });
  }

  log(`✅ EMAIL VERIFICATION COMPLETE: ${currentEmail}`);
  return respond(200, { status: "sent", template_type: templateType });
});