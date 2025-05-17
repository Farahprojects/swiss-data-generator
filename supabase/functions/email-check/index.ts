
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    // Log request details
    console.log('Request received:', req.method, req.url);
    console.log('Request headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));

    const reqBody = await req.json();
    console.log('Request payload:', JSON.stringify(reqBody, null, 2));
    
    const { email, resend } = reqBody;

    if (!email) {
      console.log('Error: Missing email in request');
      return new Response(
        JSON.stringify({ error: 'Email is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`Checking email status for: ${email}`);

    const { data: users, error } = await supabase.auth.admin.listUsers({ email });
    console.log('Users query result:', JSON.stringify({ users: users?.users?.length || 0, error: error || 'none' }, null, 2));

    if (error || !users || users.users.length === 0) {
      console.error('Error querying user or user not found:', error);
      return new Response(
        JSON.stringify({ status: 'no_pending_change' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const user = users.users[0];
    console.log('User found, details:', JSON.stringify({
      id: user.id,
      emailConfirmed: !!user.email_confirmed_at,
      hasPendingChange: !!user.email_change,
      pendingEmail: user.email_change || 'none'
    }, null, 2));

    // These fields are available only from the admin API
    const pendingChange = user.email_change;
    const token = user.email_change_token_new;

    if (!pendingChange || !token) {
      console.log('No pending email change found');
      return new Response(
        JSON.stringify({ status: 'no_pending_change' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (resend === true) {
      console.log('Resending email change verification to:', pendingChange);

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

      const verifyStatus = verifyRes.status;
      let verifyBody = '';
      try {
        verifyBody = await verifyRes.text();
        console.log('Verify response:', verifyStatus, verifyBody);
      } catch (e) {
        console.error('Failed to read verify response:', e);
      }

      if (!verifyRes.ok) {
        console.error('Resend failed:', verifyBody);
        return new Response(
          JSON.stringify({ error: 'Resend failed', details: verifyBody }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      console.log('Email resend successful');
      return new Response(
        JSON.stringify({ status: 'resent' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Returning pending status');
    return new Response(
      JSON.stringify({ status: 'pending' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
