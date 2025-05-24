

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[RESEND-EMAIL-CHANGE:${requestId}] Function invoked with method:`, req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  // Parse JSON body
  let primary = '';
  try {
    const { email } = await req.json();
    primary = (email ?? '').toLowerCase();
    console.log(`[RESEND-EMAIL-CHANGE:${requestId}] Parsed email from request:`, primary);
  } catch {
    console.error(`[RESEND-EMAIL-CHANGE:${requestId}] Failed to parse JSON body`);
    return respond(400, { error: 'Invalid JSON' });
  }

  if (!primary) {
    console.error(`[RESEND-EMAIL-CHANGE:${requestId}] No email provided in request`);
    return respond(400, { error: 'Email required' });
  }

  // Supabase Admin Client
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(url, key);

  console.log(`[RESEND-EMAIL-CHANGE:${requestId}] Initialized Supabase client for URL:`, url);

  // Look up user by email
  let user: any | null = null;
  let error: any = null;

  console.log(`[RESEND-EMAIL-CHANGE:${requestId}] Looking up user with email:`, primary);

  if (typeof supabase.auth.admin.getUserByEmail === 'function') {
    ({ data: user, error } = await supabase.auth.admin.getUserByEmail(primary));
    console.log(`[RESEND-EMAIL-CHANGE:${requestId}] Used getUserByEmail method`);
  } else {
    const res = await supabase.auth.admin.listUsers({ email: primary });
    error = res.error;
    user = res.data?.users?.find((u: any) => (u.email ?? '').toLowerCase() === primary) ?? null;
    console.log(`[RESEND-EMAIL-CHANGE:${requestId}] Used listUsers method, found`, res.data?.users?.length, 'users');
  }

  if (error) {
    console.error(`[RESEND-EMAIL-CHANGE:${requestId}] Error looking up user:`, error.message);
    return respond(500, { error: 'Lookup failed', details: error.message });
  }
  
  if (!user) {
    console.log(`[RESEND-EMAIL-CHANGE:${requestId}] No user found with email:`, primary);
    return respond(200, { status: 'no_user_found' });
  }

  console.log(`[RESEND-EMAIL-CHANGE:${requestId}] Found user details:`, {
    id: user.id,
    current_email: user.email,
    new_email: user.new_email,
    email_confirmed_at: user.email_confirmed_at,
    email_change_sent_at: user.email_change_sent_at,
    created_at: user.created_at
  });

  if (!user.new_email) {
    console.log(`[RESEND-EMAIL-CHANGE:${requestId}] User has no pending email change - current email:`, user.email);
    return respond(200, { status: 'no_pending_change' });
  }

  console.log(`[RESEND-EMAIL-CHANGE:${requestId}] PENDING EMAIL CHANGE DETECTED:`, {
    user_id: user.id,
    from_email: user.email,
    to_email: user.new_email,
    change_initiated_at: user.email_change_sent_at
  });

  // Log detailed information about what email will be sent
  console.log(`[RESEND-EMAIL-CHANGE:${requestId}] EMAIL SENDING DETAILS:`, {
    action: 'resend_email_change_verification',
    template_type: 'email_change',
    template_provider: 'supabase_built_in',
    recipient_email: user.new_email,
    user_id: user.id,
    original_email: user.email,
    email_purpose: 'verify_new_email_address'
  });

  // Resend verification email to the new_email
  console.log(`[RESEND-EMAIL-CHANGE:${requestId}] CALLING SUPABASE AUTH RESEND:`, {
    type: 'email_change',
    target_email: user.new_email,
    supabase_template: 'email_change (built-in Supabase template)'
  });
  
  const { error: resendError } = await supabase.auth.resend({
    type: 'email_change',
    email: user.new_email,
  });

  if (resendError) {
    console.error(`[RESEND-EMAIL-CHANGE:${requestId}] EMAIL SENDING FAILED:`, {
      error_message: resendError.message,
      error_code: resendError.status,
      target_email: user.new_email,
      user_id: user.id,
      original_email: user.email,
      template_used: 'supabase_email_change',
      failure_time: new Date().toISOString()
    });
    return respond(500, { error: 'Resend failed', details: resendError.message });
  }

  console.log(`[RESEND-EMAIL-CHANGE:${requestId}] EMAIL SUCCESSFULLY SENT:`, {
    success: true,
    email_type: 'email_change_verification',
    template_used: 'supabase_built_in_email_change_template',
    recipient_email: user.new_email,
    user_id: user.id,
    original_email: user.email,
    sent_at: new Date().toISOString(),
    email_purpose: 'User must click link in this email to verify new email address',
    next_step: 'User should check ' + user.new_email + ' for verification email'
  });

  return respond(200, { status: 'resent' });

  function respond(status: number, body: any) {
    console.log(`[RESEND-EMAIL-CHANGE:${requestId}] Responding with status:`, status, 'body:', body);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
});

