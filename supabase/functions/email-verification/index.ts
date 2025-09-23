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

  let email = "";
  let url = "";
  let templateType = "email_verification";
  
  try {
    const body = await req.json();
    email = body.email ?? "";
    url = body.url ?? "";
    templateType = body.template_type ?? "email_verification";
    log("✓ Request received:", { email, templateType });
  } catch (e) {
    log("✗ JSON parsing failed:", e);
    return respond(400, { error: "Invalid JSON" });
  }

  if (!email) {
    log("✗ Missing email parameter");
    return respond(400, { error: "email is required" });
  }

  if (!url) {
    log("✗ Missing url parameter");
    return respond(400, { error: "url is required" });
  }


  const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const smtpEndpoint = Deno.env.get("OUTBOUND_SMTP_ENDPOINT");

  if (!supabaseUrl || !key || !smtpEndpoint) {
    log("✗ Missing environment variables:", { hasUrl: !!supabaseUrl, hasKey: !!key, hasSmtp: !!smtpEndpoint });
    return respond(500, { error: "Missing environment variables" });
  }

  const supabase = createClient(supabaseUrl, key);

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

  // Template variable substitution - simple and universal
  log("→ Processing template variables");
  const originalHtml = templateData.body_html;
  let html = templateData.body_html;
  
  // Simple replacement: insert the URL into {{verification_link}}
  html = html.replace(/\{\{verification_link\}\}/g, url);
  
  const linkReplacements = (originalHtml.match(/\{\{verification_link\}\}/g) || []).length;
  log("✓ Template processing complete:", { linkReplacements, url });

  // Build VPS-compatible payload
  const payload = {
    slug: "noreply",                    // Hardcoded for verification pipeline
    domain: "therai.co",               // Hardcoded for verification pipeline
    to_email: email,                   // Dynamic: email from payload
    subject: templateData.subject,     // Dynamic: from template
    body: html,                        // Dynamic: processed HTML template
    request_id: email,                 // Use email for correlation
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

  log(`✅ EMAIL VERIFICATION COMPLETE: ${email}`);
  return respond(200, { status: "sent", template_type: templateType });
});