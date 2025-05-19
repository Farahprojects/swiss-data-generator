
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

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const email = body?.email;
  const resend = body?.resend === true;

  if (!email) {
    return new Response(
      JSON.stringify({ error: 'Email is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const { data: userData, error } = await supabase.auth.admin.listUsers({ email });

  if (error || !userData?.users || userData.users.length === 0) {
    return new Response(
      JSON.stringify({ status: 'no_pending_change' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  const user = userData.users[0];
  const pendingEmail = user.email_change || user.new_email || null;

  if (!pendingEmail) {
    return new Response(
      JSON.stringify({ status: 'no_pending_change' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  if (resend) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      email: pendingEmail,
    });

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Resend failed', details: updateError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ status: 'resent' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  return new Response(
    JSON.stringify({ status: 'pending', new_email: pendingEmail }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
});
