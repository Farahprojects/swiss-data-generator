// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  // Parse JSON body
  let primary = '';
  try {
    const { email } = await req.json();
    primary = (email ?? '').toLowerCase();
  } catch {
    return respond(400, { error: 'Invalid JSON' });
  }

  if (!primary) return respond(400, { error: 'Email required' });

  // Supabase Admin Client
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(url, key);

  // Look up user by email
  let user: any | null = null;
  let error: any = null;

  if (typeof supabase.auth.admin.getUserByEmail === 'function') {
    ({ data: user, error } = await supabase.auth.admin.getUserByEmail(primary));
  } else {
    const res = await supabase.auth.admin.listUsers({ email: primary });
    error = res.error;
    user = res.data?.users?.find((u: any) => (u.email ?? '').toLowerCase() === primary) ?? null;
  }

  if (error) return respond(500, { error: 'Lookup failed', details: error.message });
  if (!user) return respond(200, { status: 'no_user_found' });
  if (!user.new_email) return respond(200, { status: 'no_pending_change' });

  // Resend verification email to the new_email
  const { error: resendError } = await supabase.auth.resend({
    type: 'email_change',
    email: user.new_email,
  });

  if (resendError) {
    return respond(500, { error: 'Resend failed', details: resendError.message });
  }

  return respond(200, { status: 'resent' });

  function respond(status: number, body: any) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }
});
