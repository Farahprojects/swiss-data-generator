
// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[RESEND-EMAIL-CHANGE] Function invoked with method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  // Parse JSON body
  let primary = '';
  try {
    const { email } = await req.json();
    primary = (email ?? '').toLowerCase();
    console.log('[RESEND-EMAIL-CHANGE] Parsed email from request:', primary);
  } catch {
    console.error('[RESEND-EMAIL-CHANGE] Failed to parse JSON body');
    return respond(400, { error: 'Invalid JSON' });
  }

  if (!primary) {
    console.error('[RESEND-EMAIL-CHANGE] No email provided in request');
    return respond(400, { error: 'Email required' });
  }

  // Supabase Admin Client
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(url, key);

  console.log('[RESEND-EMAIL-CHANGE] Initialized Supabase client');

  // Look up user by email
  let user: any | null = null;
  let error: any = null;

  console.log('[RESEND-EMAIL-CHANGE] Looking up user with email:', primary);

  if (typeof supabase.auth.admin.getUserByEmail === 'function') {
    ({ data: user, error } = await supabase.auth.admin.getUserByEmail(primary));
    console.log('[RESEND-EMAIL-CHANGE] Used getUserByEmail method');
  } else {
    const res = await supabase.auth.admin.listUsers({ email: primary });
    error = res.error;
    user = res.data?.users?.find((u: any) => (u.email ?? '').toLowerCase() === primary) ?? null;
    console.log('[RESEND-EMAIL-CHANGE] Used listUsers method, found', res.data?.users?.length, 'users');
  }

  if (error) {
    console.error('[RESEND-EMAIL-CHANGE] Error looking up user:', error.message);
    return respond(500, { error: 'Lookup failed', details: error.message });
  }
  
  if (!user) {
    console.log('[RESEND-EMAIL-CHANGE] No user found with email:', primary);
    return respond(200, { status: 'no_user_found' });
  }

  console.log('[RESEND-EMAIL-CHANGE] Found user:', {
    id: user.id,
    email: user.email,
    new_email: user.new_email,
    email_confirmed_at: user.email_confirmed_at,
    email_change_sent_at: user.email_change_sent_at
  });

  if (!user.new_email) {
    console.log('[RESEND-EMAIL-CHANGE] User has no pending email change');
    return respond(200, { status: 'no_pending_change' });
  }

  console.log('[RESEND-EMAIL-CHANGE] User has pending email change from', user.email, 'to', user.new_email);

  // Resend verification email to the new_email
  console.log('[RESEND-EMAIL-CHANGE] Attempting to resend email change verification to:', user.new_email);
  console.log('[RESEND-EMAIL-CHANGE] This will use Supabase\'s built-in email_change template');
  
  const { error: resendError } = await supabase.auth.resend({
    type: 'email_change',
    email: user.new_email,
  });

  if (resendError) {
    console.error('[RESEND-EMAIL-CHANGE] Failed to resend verification email:', {
      error: resendError.message,
      code: resendError.status,
      target_email: user.new_email,
      user_id: user.id
    });
    return respond(500, { error: 'Resend failed', details: resendError.message });
  }

  console.log('[RESEND-EMAIL-CHANGE] Successfully resent email change verification:', {
    target_email: user.new_email,
    user_id: user.id,
    original_email: user.email,
    template_used: 'supabase_email_change_template',
    sent_at: new Date().toISOString()
  });

  return respond(200, { status: 'resent' });

  function respond(status: number, body: any) {
    console.log('[RESEND-EMAIL-CHANGE] Responding with status:', status, 'body:', body);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
});
