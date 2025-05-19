import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL  = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE)
    return new Response(JSON.stringify({ error: 'Server config error' }), { status: 500, headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  /* ---------- parse body ---------- */
  let payload: { email?: string; resend?: boolean };
  try { payload = JSON.parse(await req.text() || '{}'); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders }); }

  const email   = (payload.email || '').trim().toLowerCase();
  const resend  = !!payload.resend;
  if (!email)
    return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400, headers: corsHeaders });

  /* ---------- 1. look up by primary email ---------- */
  const { data: user1, error: err1 } = await supabase
    .from('auth.users')
    .select('id,email,email_change')
    .eq('email', email)
    .maybeSingle();

  if (err1) return new Response(JSON.stringify({ error: err1.message }), { status: 500, headers: corsHeaders });

  let user = user1;

  /* ---------- 2. if not found, look up by email_change ---------- */
  if (!user) {
    const { data: user2, error: err2 } = await supabase
      .from('auth.users')
      .select('id,email,email_change')
      .eq('email_change', email)
      .maybeSingle();
    if (err2) return new Response(JSON.stringify({ error: err2.message }), { status: 500, headers: corsHeaders });
    user = user2;
  }

  if (!user)                           // nobody with that email anywhere
    return new Response(JSON.stringify({ status: 'no_pending_change' }), { status: 200, headers: corsHeaders });

  if (!user.email_change)              // user exists but no pending change
    return new Response(JSON.stringify({ status: 'no_pending_change' }), { status: 200, headers: corsHeaders });

  /* ---------- pending change exists ---------- */
  if (resend) {
    const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
      email: user.email_change  // re-set to same value = resend verification
    });
    if (updateErr)
      return new Response(JSON.stringify({ error: 'Resend failed', details: updateErr.message }),
                          { status: 500, headers: corsHeaders });

    return new Response(JSON.stringify({ status: 'resent' }), { status: 200, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ status: 'pending' }), { status: 200, headers: corsHeaders });
});
