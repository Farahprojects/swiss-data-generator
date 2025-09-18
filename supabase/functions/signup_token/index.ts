
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
    console.log(`[SIGNUP-CONFIRM:${requestId}] ${msg}`, ...args);

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
  const redirectTo = "https://auth.therai.co/auth/email";
  let tokenLink = "";
  let emailOtp = "";
  let userEmail = "";

  // User data fetching with detailed logging
  try {
    log("→ Fetching user data for:", userId);
    const { data: userData, error: fetchErr } = await supabase.auth.admin.getUserById(userId);

    if (fetchErr || !userData?.user) {
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
      email_confirmed_at: userData.user.email_confirmed_at,
      created_at: userData.user.created_at,
    });

    userEmail = userData.user.email;

    if (!userEmail) {
      log("✗ User missing email:", {
        userId,
        hasEmail: !!userEmail,
        userKeys: Object.keys(userData.user),
      });
      return respond(400, {
        error: "User does not have a valid email",
        user: userData,
      });
    }

    log("✓ User email confirmed:", userEmail);
  } catch (e: any) {
    log("✗ Exception during user fetch:", e.message);
    return respond(500, { error: "Error fetching user data", details: e.message });
  }

  // Token generation with detailed logging
  try {
    log("→ Generating signup confirmation token");
    log("Token generation params:", {
      type: "signup",
      email: userEmail,
      redirectTo,
    });

    const { data: linkData, error: tokenErr } = await supabase.auth.admin.generateLink({
      type: "signup",
      email: userEmail,
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
    tokenLink += `&email=${encodeURIComponent(userEmail)}`;
    
    log("✓ Link construction complete:", {
      originalLength: originalLink.length,
      finalLength: tokenLink.length,
      addedParam: `email=${encodeURIComponent(userEmail)}`,
    });
    log("Final verification link:", tokenLink);
  } catch (err: any) {
    log("✗ Exception during token generation:", err.message);
    return respond(500, { error: "Link generation failed", details: err.message });
  }

  // Pass token to email-verification function
  try {
    log("→ Calling email-verification function with token");
    const { error: emailErr } = await supabase.functions.invoke('email-verification', {
      body: {
        user_id: userId,
        token_link: tokenLink,
        email_otp: emailOtp,
        template_type: "email_verification"
      }
    });

    if (emailErr) {
      log("✗ Email-verification function failed:", emailErr);
      return respond(500, { error: "Email sending failed", details: emailErr.message });
    }

    log("✓ Email-verification function completed successfully");
  } catch (err: any) {
    log("✗ Exception calling email-verification:", err.message);
    return respond(500, { error: "Email delivery failed", details: err.message });
  }

  log(`✅ SIGNUP TOKEN GENERATED: ${userEmail}`);
  return respond(200, { status: "sent", template_type: "email_verification" });
});
