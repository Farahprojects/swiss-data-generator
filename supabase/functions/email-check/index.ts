
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[Request received]', {
    method: req.method,
    url: req.url,
    hasAuthHeader: req.headers.has('authorization'),
    hasApiKey: req.headers.has('apikey'),
    contentType: req.headers.get('content-type')
  });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('[Environment Error] Missing required env variables:', {
      hasSupabaseUrl: !!SUPABASE_URL,
      hasServiceRoleKey: !!SERVICE_ROLE_KEY
    });
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    console.log('[Processing request body]');
    let rawBody;
    try {
      rawBody = await req.text();
      console.log('[Raw Request Body]', rawBody);
    } catch (textError) {
      console.error('[Request Text Error]', textError);
      return new Response(
        JSON.stringify({ error: 'Failed to read request body', details: textError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    let email: string | undefined;
    let resend: boolean | undefined;

    try {
      const parsed = JSON.parse(rawBody);
      console.log('[Parsed JSON]', parsed);
      email = parsed.email;
      resend = parsed.resend;
    } catch (parseError) {
      console.error('[JSON Parse Error]', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!email) {
      console.warn('[Validation Error] Missing email in payload');
      return new Response(
        JSON.stringify({ error: 'Email is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`[Supabase Lookup] Checking user with email: ${email}`);

    const { data: users, error } = await supabase.auth.admin.listUsers({ email });

    if (error) {
      console.error('[Supabase Admin API Error]', error.message);
      return new Response(
        JSON.stringify({ error: 'Failed to query user.', details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!users || users.length === 0) {
      console.log('[User Not Found] No user matches email:', email);
      return new Response(
        JSON.stringify({ status: 'no_pending_change' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const user = users[0];
    const pendingChange = user.email_change;
    const token = user.email_change_token_new;

    console.log('[User Found]', {
      email: user.email,
      email_change: pendingChange,
      has_token: !!token
    });

    if (!pendingChange || !token) {
      console.log('[No Pending Email Change] Either email_change or token is missing.');
      return new Response(
        JSON.stringify({ status: 'no_pending_change' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (resend === true) {
      console.log('[Resend Requested] Triggering Supabase verification to:', pendingChange);

      const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          email: pendingChange,
          type: 'email_change',
        }),
      });

      if (!verifyRes.ok) {
        const msg = await verifyRes.text();
        console.error('[Verification Resend Failed]', msg);
        return new Response(
          JSON.stringify({ error: 'Resend failed', details: msg }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      console.log('[Verification Email Resent Successfully]');
      return new Response(
        JSON.stringify({ status: 'resent' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('[Pending Email Detected] Resend not triggered.');
    return new Response(
      JSON.stringify({ status: 'pending' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err) {
    console.error('[Unhandled Exception]', err.message);
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
