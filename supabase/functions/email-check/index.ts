
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const { email, resend } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required.' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log(`Checking email status for: ${email}`);
    
    // We need to use raw query because auth.users is not accessible via the from() API
    const { data: user, error } = await supabase
      .rpc('admin_get_user_by_email', { email_input: email })
      .maybeSingle();

    if (error) {
      console.error('Error querying user:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to query user.', details: error.message }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    if (!user || !user.email_change_token_new) {
      console.log('No pending email change found for:', email);
      return new Response(
        JSON.stringify({ status: 'no_pending_change' }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log('Found pending email change:', user.email_change);

    // Only resend if requested
    if (resend === true && user.email_change) {
      console.log('Resending verification to:', user.email_change);
      
      const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          email: user.email_change,
          type: 'email_change',
        }),
      });

      if (!verifyRes.ok) {
        const msg = await verifyRes.text();
        console.error('Resend failed:', msg);
        return new Response(
          JSON.stringify({ error: 'Resend failed', details: msg }),
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        );
      }

      console.log('Successfully resent verification email');
      return new Response(
        JSON.stringify({ status: 'resent' }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Just report that it's pending
    console.log('Reporting pending status without resending');
    return new Response(
      JSON.stringify({ status: 'pending' }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: err.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
});
