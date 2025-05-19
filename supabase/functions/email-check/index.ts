import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[Incoming Request]', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.method === 'OPTIONS') {
    console.log('[Preflight Request] Sending CORS headers');
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('[Environment Error] Missing Supabase credentials');
    return new Response(
      JSON.stringify({ error: 'Server config error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body;
  try {
    const raw = await req.text();
    console.log('[Raw Request Body]', raw);
    body = JSON.parse(raw);
  } catch (err) {
    console.error('[JSON Parse Error]', err.message);
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const email = body?.email;
  const resend = body?.resend === true;

  if (!email) {
    console.warn('[Validation Error] Missing email in request body');
    return new Response(
      JSON.stringify({ error: 'Email is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  console.log('[User Lookup]', { queryingByEmail: email });

  const { data: userData, error } = await supabase.auth.admin.listUsers({ email });

  if (error) {
    console.error('[Supabase Error]', error.message);
    return new Response(
      JSON.stringify({ error: 'Supabase user query failed', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  console.log('[Supabase Query Result]', {
    userCount: userData?.users?.length || 0,
    rawUser: userData?.users?.[0] || null,
  });

  const user = userData?.users?.[0];

  if (!user) {
    console.log('[Result] No user found matching that email');
    return new Response(
      JSON.stringify({ status: 'no_pending_change' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const pendingEmail = user.email_change || user.new_email || null;

  console.log('[User Fields]', {
    user_id: user.id,
    email: user.email,
    email_change: user.email_change || 'none',
    new_email: user.new_email || 'none',
    is_email_confirmed: user.email_confirmed,
  });

  if (!pendingEmail) {
    console.log('[Result] User exists, but no pending email change found');
    return new Response(
      JSON.stringify({ status: 'no_pending_change' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  if (resend) {
    console.log('[Resend Requested] Re-setting email to re-trigger verification', { to: pendingEmail });

    const { error: resendError } = await supabase.auth.admin.updateUserById(user.id, {
      email: pendingEmail,
    });

    if (resendError) {
      console.error('[Resend Failed]', resendError.message);
      return new Response(
        JSON.stringify({ error: 'Resend failed', details: resendError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('[Resend Success] Email change re-triggered');
    return new Response(
      JSON.stringify({ status: 'resent' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  console.log('[Result] Pending email change found', { pending_email: pendingEmail });

  return new Response(
    JSON.stringify({ status: 'pending', new_email: pendingEmail }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
});
