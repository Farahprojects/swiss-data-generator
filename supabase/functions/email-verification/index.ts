
// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[EMAIL-VERIFICATION:${requestId}] Function invoked with method:`, req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  // Parse JSON body
  let email = '';
  let templateType = '';
  try {
    const body = await req.json();
    email = (body.email ?? '').toLowerCase();
    templateType = body.template_type ?? 'email_change';
    console.log(`[EMAIL-VERIFICATION:${requestId}] Parsed request:`, { email, templateType });
  } catch {
    return respond(400, { error: 'Invalid JSON' });
  }

  if (!email) return respond(400, { error: 'Email required' });
  if (!['email_change', 'password_reset', 'signup_confirmation'].includes(templateType)) {
    return respond(400, { error: 'Invalid template_type' });
  }

  // Supabase Admin Client
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const smtpEndpoint = Deno.env.get('THERIA_SMTP_ENDPOINT');
  
  if (!url || !key || !smtpEndpoint) {
    return respond(500, { error: 'Missing environment variables' });
  }

  const supabase = createClient(url, key);

  // Look up user by email
  let user: any = null;
  let error: any = null;
  
  console.log(`[EMAIL-VERIFICATION:${requestId}] Looking up user with email:`, email);

  if (typeof supabase.auth.admin.getUserByEmail === 'function') {
    ({ data: user, error } = await supabase.auth.admin.getUserByEmail(email));
  } else {
    const res = await supabase.auth.admin.listUsers({ email });
    error = res.error;
    user = res.data?.users?.find((u: any) => (u.email ?? '').toLowerCase() === email) ?? null;
  }

  if (error) {
    console.error(`[EMAIL-VERIFICATION:${requestId}] User lookup failed:`, error.message);
    return respond(500, { error: 'User lookup failed', details: error.message });
  }
  
  if (!user) {
    console.log(`[EMAIL-VERIFICATION:${requestId}] No user found with email:`, email);
    return respond(200, { status: 'no_user_found' });
  }

  console.log(`[EMAIL-VERIFICATION:${requestId}] Found user:`, { id: user.id, email: user.email, new_email: user.new_email });

  // Generate appropriate verification link based on template type
  let tokenLink = '';
  let targetEmail = email;

  try {
    if (templateType === 'email_change') {
      if (!user.new_email) {
        console.log(`[EMAIL-VERIFICATION:${requestId}] No pending email change found for user`);
        return respond(200, { status: 'no_pending_change' });
      }
      targetEmail = user.new_email;
      
      // Use the correct type for email change confirmation
      const { data: linkData, error: tokenError } = await supabase.auth.admin.generateLink({
        type: 'email_change_confirm_new',
        email: user.new_email
      });

      if (tokenError) {
        console.error(`[EMAIL-VERIFICATION:${requestId}] Email change token generation failed:`, tokenError.message);
        return respond(500, { error: 'Token generation failed', details: tokenError.message });
      }
      tokenLink = linkData?.action_link || '';

    } else if (templateType === 'password_reset') {
      const { data: linkData, error: tokenError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: user.email
      });

      if (tokenError) {
        console.error(`[EMAIL-VERIFICATION:${requestId}] Password reset token generation failed:`, tokenError.message);
        return respond(500, { error: 'Token generation failed', details: tokenError.message });
      }
      tokenLink = linkData?.action_link || '';

    } else if (templateType === 'signup_confirmation') {
      const { data: linkData, error: tokenError } = await supabase.auth.admin.generateLink({
        type: 'signup',
        email: user.email
      });

      if (tokenError) {
        console.error(`[EMAIL-VERIFICATION:${requestId}] Signup confirmation token generation failed:`, tokenError.message);
        return respond(500, { error: 'Token generation failed', details: tokenError.message });
      }
      tokenLink = linkData?.action_link || '';
    }

    if (!tokenLink) {
      return respond(500, { error: 'Failed to generate verification link' });
    }

    console.log(`[EMAIL-VERIFICATION:${requestId}] Generated ${templateType} token successfully for:`, targetEmail);

  } catch (tokenError: any) {
    console.error(`[EMAIL-VERIFICATION:${requestId}] Token generation error:`, tokenError.message);
    return respond(500, { error: 'Token generation failed', details: tokenError.message });
  }

  // Fetch email template from token_emails table
  const { data: templateData, error: templateError } = await supabase
    .from('token_emails')
    .select('subject, body_html, body_text')
    .eq('template_type', templateType)
    .single();

  if (templateError || !templateData) {
    console.error(`[EMAIL-VERIFICATION:${requestId}] Template fetch failed:`, templateError?.message);
    return respond(500, { error: 'Template fetch failed', details: templateError?.message });
  }

  console.log(`[EMAIL-VERIFICATION:${requestId}] Retrieved ${templateType} template`);

  // Replace placeholders in template
  const html = templateData.body_html.replace(/\{\{\s*\.Link\s*\}\}/g, tokenLink);
  const text = templateData.body_text.replace(/\{\{\s*\.Link\s*\}\}/g, tokenLink);

  // Send email via custom SMTP endpoint
  console.log(`[EMAIL-VERIFICATION:${requestId}] Sending ${templateType} email to:`, targetEmail);
  
  const sendResponse = await fetch(smtpEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: targetEmail,
      subject: templateData.subject,
      html,
      text,
      from: "Theria Astro <no-reply@theraiastro.com>"
    })
  });

  if (!sendResponse.ok) {
    const errorText = await sendResponse.text();
    console.error(`[EMAIL-VERIFICATION:${requestId}] Email sending failed:`, errorText);
    return respond(500, {
      error: 'Email sending failed',
      details: errorText
    });
  }

  console.log(`[EMAIL-VERIFICATION:${requestId}] Successfully sent ${templateType} email to:`, targetEmail);
  return respond(200, { 
    status: 'sent',
    template_type: templateType,
    target_email: targetEmail
  });

  function respond(status: number, body: Record<string, any>) {
    console.log(`[EMAIL-VERIFICATION:${requestId}] Responding with status:`, status, 'body:', body);
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...CORS
      }
    });
  }
});
