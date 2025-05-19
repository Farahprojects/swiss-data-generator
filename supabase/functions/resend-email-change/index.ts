
// deno-lint-ignore-file no-explicit-any
// ────────────────────────────────────────────────────────────────────────────────
//  resend-email-change.ts   (Edge Function)
//  POST { email: "<current-primary>" }
// ────────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[Edge version] 2025-05-19-resend-email-change');

  if (req.method === 'OPTIONS')
    return new Response(null, { headers: cors });

  /* Read JSON body ---------------------------------------------------------- */
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const primaryEmail = body.email?.toLowerCase() ?? '';
  if (!primaryEmail) return badRequest('Email required');

  /* Init Supabase ----------------------------------------------------------- */
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(url, key);

  /* Get the user by PRIMARY email ------------------------------------------ */
  const { data: user, error: lookupErr } =
    await supabase.auth.admin.getUserByEmail(primaryEmail);

  if (lookupErr)
    return serverError('Lookup failed', lookupErr.message);
  if (!user)
    return ok('no_user_found');

  if (!user.new_email) {
    console.log('[No pending change] new_email is null');
    return ok('no_pending_change');
  }

  /* Resend the email-change link ------------------------------------------- */
  console.log('[Resend] Sending to', user.new_email);
  const { error: resendErr } = await supabase.auth.resend({
    type: 'email_change',
    email: user.new_email,
    // optional redirect:
    // options: { emailRedirectTo: 'https://yourapp.com/account/confirm' }
  });

  if (resendErr)
    return serverError('Resend failed', resendErr.message);

  console.log('[Resent OK]');
  return ok('resent');

  /* Helper responses -------------------------------------------------------- */
  function ok(status: string) {
    return new Response(
      JSON.stringify({ status }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...cors } },
    );
  }
  function badRequest(msg: string) {
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...cors } },
    );
  }
  function serverError(msg: string, details?: string) {
    return new Response(
      JSON.stringify({ error: msg, details }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...cors } },
    );
  }
});
