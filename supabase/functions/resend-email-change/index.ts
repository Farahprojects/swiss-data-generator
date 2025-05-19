// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[Edge version] 2025-05-19-resend-fallback');

  if (req.method === 'OPTIONS')
    return new Response(null, { headers: CORS });

  /* ─ Parse body ─ */
  let primary = '';
  try {
    const { email } = await req.json();
    primary = (email ?? '').toLowerCase();
  } catch {
    return badRequest('Invalid JSON');
  }
  if (!primary) return badRequest('Email required');

  /* ─ Supabase client ─ */
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(url, key);

  /* ─ Lookup user by PRIMARY email ─ */
  let user: any | null = null;
  let lookupErr: any = null;

  if (typeof supabase.auth.admin.getUserByEmail === 'function') {
    ({ data: user, error: lookupErr } =
      await supabase.auth.admin.getUserByEmail(primary));
  } else {
    /* fallback using listUsers */
    const { data, error } = await supabase.auth.admin.listUsers({ email: primary });
    lookupErr = error;
    user = data?.users.find((u: any) => (u.email ?? '').toLowerCase() === primary) ?? null;
  }

  if (lookupErr)
    return serverError('Lookup failed', lookupErr.message);
  if (!user)
    return ok('no_user_found');

  if (!user.new_email)      // <── pending e-mail lives here
    return ok('no_pending_change');

  /* ─ Resend email-change link ─ */
  const { error: resendErr } = await supabase.auth.resend({
    type: 'email_change',
    email: user.new_email,
  });

  if (resendErr)
    return serverError('Resend failed', resendErr.message);

  return ok('resent');

  /* helpers */
  function ok(status: string) {
    return new Response(
      JSON.stringify({ status }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } },
    );
  }
  function badRequest(msg: string) {
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } },
    );
  }
  function serverError(msg: string, details?: string) {
    return new Response(
      JSON.stringify({ error: msg, details }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } },
    );
  }
});
