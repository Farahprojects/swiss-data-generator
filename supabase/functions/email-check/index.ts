
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

    let email = '';
    let resend = false;

    try {
      if (rawBody) {
        const parsed = JSON.parse(rawBody);
        console.log('[Parsed JSON]', parsed);
        
        if (parsed && typeof parsed === 'object') {
          email = parsed.email || '';
          resend = !!parsed.resend;
        }
      }
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

    console.log('[Supabase Users Result]', {
      usersFound: users?.users ? users.users.length : 0,
      usersObject: users ? typeof users : 'undefined'
    });

    // If no users found or users array is empty
    if (!users?.users || users.users.length === 0) {
      console.log('[User Not Found] No user matches email:', email);
      return new Response(
        JSON.stringify({ status: 'no_pending_change' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const user = users.users[0];
    
    console.log('[DEBUG Path 1] About to check if user is defined');
    // Make sure user is defined before accessing properties
    if (!user) {
      console.log('[DEBUG Path 1A] User object is undefined');
      return new Response(
        JSON.stringify({ status: 'no_pending_change' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Safe logging with optional chaining
    console.log('[DEBUG Path 2] User found, checking properties', {
      email: user.email || 'undefined',
      has_new_email: user.new_email ? 'YES' : 'NO',
      new_email_value: user.new_email || 'not set',
      user_keys: Object.keys(user)
    });
    
    // SIMPLIFIED: Check for new_email instead of email_change
    console.log('[DEBUG Path 3] Checking for new_email property');
    if (!user.new_email) {
      console.log('[DEBUG Path 3A] No Pending Email Change - new_email property missing');
      return new Response(
        JSON.stringify({ status: 'no_pending_change' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    // We have a new_email, so there's a pending email verification
    const pendingChange = user.new_email;
    console.log('[DEBUG] Pending email change found:', pendingChange);
    
    // Handle resend if requested
    if (resend === true) {
      console.log('[DEBUG Path 5A] Resend requested, triggering verification to:', pendingChange);

      // Prepare the request body - make sure it matches what Supabase expects
      const verifyPayload = {
        email: pendingChange,
        type: 'email_change',
      };
      
      console.log('[Verify Request Payload]', JSON.stringify(verifyPayload));

      const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
        },
        body: JSON.stringify(verifyPayload),
      });

      // Always log the full response for debugging
      const responseStatus = verifyRes.status;
      let responseBody = '';
      try {
        responseBody = await verifyRes.text();
        console.log('[Resend Response]', responseStatus, responseBody);
      } catch (error) {
        console.error('[Error reading response]', error);
      }

      // Try to parse as JSON if it looks like JSON
      let jsonResponse = null;
      if (responseBody && (responseBody.startsWith('{') || responseBody.startsWith('['))) {
        try {
          jsonResponse = JSON.parse(responseBody);
          console.log('[Parsed Resend Response]', jsonResponse);
        } catch (e) {
          console.log('[Response not valid JSON]');
        }
      }

      if (!verifyRes.ok) {
        console.error('[Verification Resend Failed]', responseBody);
        return new Response(
          JSON.stringify({ 
            error: 'Resend failed', 
            status: responseStatus,
            details: responseBody 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      console.log('[DEBUG Path 5B] Verification Email Resent Successfully');
      return new Response(
        JSON.stringify({ status: 'resent' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('[DEBUG Path 6] Pending Email Change Detected - new_email exists');
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
