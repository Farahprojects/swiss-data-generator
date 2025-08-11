
// deno-lint-ignore-file 
// ────────────────────────────────────────────────────────────────────────────────
//  check-email-change.ts   – full verbose
// ────────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

/* ──────────────────────────────────────────────────────────────────────────── */
serve(async (req) => {
  console.log('[Request received]', {
    method: req.method,
    url: req.url,
    hasAuthHeader: req.headers.has('authorization'),
    hasApiKey: req.headers.has('apikey'),
    contentType: req.headers.get('content-type'),
  });

  /* OPTIONS pre-flight  */
  if (req.method === 'OPTIONS')
    return new Response(null, { headers: corsHeaders });

  /* ENV check */
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('[Environment Error] Missing required env variables');
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  /* Parse body */
  let email = '';
  let resend = false;
  try {
    const raw = await req.text();
    console.log('[Raw Request Body]', raw);
    if (raw) {
      const parsed = JSON.parse(raw);
      console.log('[Parsed JSON]', parsed);
      email = (parsed.email ?? '').toLowerCase();
      resend = !!parsed.resend;
    }
  } catch (err) {
    console.error('[JSON Parse Error]', err);
    return new Response(
      JSON.stringify({ error: 'Invalid JSON payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  if (!email) {
    console.warn('[Validation Error] Missing email in payload');
    return new Response(
      JSON.stringify({ error: 'Email is required.' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  /* Exact-match lookup */
  console.log(`[Supabase Lookup] Checking user with email: ${email}`);
  const { data: listRes, error: listErr } = await supabase.auth.admin.listUsers({
    email,
  });

  if (listErr) {
    console.error('[Supabase Admin API Error]', listErr);
    return new Response(
      JSON.stringify({ error: 'Failed to query user.', details: listErr.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  console.log('[Supabase Users Result]', {
    usersFound: listRes?.users?.length ?? 0,
    primaryEmails: listRes?.users?.map((u: any) => u.email),
    emailChanges: listRes?.users?.map((u: any) => u.email_change),
  });

  /* Filter: keep only the record whose PRIMARY e-mail matches */
  const user = listRes?.users.find(
    (u: any) => (u.email ?? '').toLowerCase() === email,
  );

  console.log('[Filter Result] Exact primary-email match:', !!user, {
    matchedUserEmail: user?.email,
    matchedUserId: user?.id,
  });

  if (!user) {
    console.log('[User Not Found] No exact primary-email match.');
    return new Response(
      JSON.stringify({ status: 'no_pending_change' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  /* ────── Pending e-mail change? ────── */
console.log('[DEBUG] Checking user.new_email:', user.new_email);
if (!user.new_email) {
  console.log('[No Pending Change] new_email is undefined');
  return new Response(
    JSON.stringify({ status: 'no_pending_change' }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
  );
}

const pendingTo = user.new_email;
console.log('[Pending Change Detected]', pendingTo);

  /* Optional: resend verification */
  if (resend) {
    console.log('[Resend requested] Re-setting email to trigger new verification');
    const { error: updErr } = await supabase.auth.admin.updateUserById(user.id, {
      email: pendingTo,
    });
    if (updErr) {
      console.error('[Admin Email Reset Failed]', updErr);
      return new Response(
        JSON.stringify({ error: 'Resend failed', details: updErr.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }
    console.log('[Verification email re-triggered]');
    return new Response(
      JSON.stringify({ 
        status: 'resent',
        current_email: user.email,
        pending_to: pendingTo
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  /* Success */
  return new Response(
    JSON.stringify({ 
      status: 'pending', 
      current_email: user.email,
      pending_to: pendingTo 
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
  );
});
