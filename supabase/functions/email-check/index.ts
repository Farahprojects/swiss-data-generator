// deno-lint-ignore-file no-explicit-any
// ────────────────────────────────────────────────────────────────────────────────
// 📧  check-email-change.ts  – verbose version
// Keeps your original step-by-step console.logs but filters the `listUsers`
// result so we only inspect the row whose *primary* email matches the payload.
// ────────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[Request received]', {
    method: req.method,
    url: req.url,
    hasAuthHeader: req.headers.has('authorization'),
    hasApiKey: req.headers.has('apikey'),
    contentType: req.headers.get('content-type'),
  });

  // ────── OPTIONS pre-flight ──────
  if (req.method === 'OPTIONS')
    return new Response(null, { headers: corsHeaders });

  // ────── ENV guard ──────
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('[Environment Error] Missing required env variables:', {
      hasSupabaseUrl: !!SUPABASE_URL,
      hasServiceRoleKey: !!SERVICE_ROLE_KEY,
    });
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ────── Parse JSON body ──────
  let email = '';
  let resend = false;

  try {
    console.log('[Processing request body]');
    const rawBody = await req.text();
    console.log('[Raw Request Body]', rawBody);

    if (rawBody) {
      const parsed = JSON.parse(rawBody);
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

  // ────── Exact-match lookup ──────
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
    usersReturned: listRes?.users?.length ?? 0,
    userEmails: listRes?.users?.map((u: any) => u.email),
    userNewEmails: listRes?.users?.map((u: any) => u.new_email),
  });

  // filter to the *primary* email match
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

  // ────── Pending change? ──────
  console.log('[DEBUG Path 3] Checking for new_email property');
  if (!user.new_email) {
    console.log('[DEBUG Path 3A] No Pending Email Change – new_email property missing');
    return new Response(
      JSON.stringify({ status: 'no_pending_change' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  console.log('[DEBUG] Pending email change found:', user.new_email);

  // ────── Resend verification (optional) ──────
  if (resend) {
    console.log(
      '[DEBUG Path 5A] Resend requested – re-setting email to trigger new verification',
      user.new_email,
    );
    const { error: updErr } = await supabase.auth.admin.updateUserById(user.id, {
      email: user.new_email,
    });

    if (updErr) {
      console.error('[Admin Email Reset Failed]', updErr);
      return new Response(
        JSON.stringify({ error: 'Resend failed', details: updErr.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    console.log('[Verification Email Re-triggered by Re-setting Email]');
    return new Response(
      JSON.stringify({ status: 'resent' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  console.log('[DEBUG Path 6] Pending Email Change Detected – new_email exists');

  // ────── Success ──────
  return new Response(
    JSON.stringify({ status: 'pending', pending_to: user.new_email }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
  );
});
