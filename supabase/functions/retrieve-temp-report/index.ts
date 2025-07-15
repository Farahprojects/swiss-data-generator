import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uuid, token: providedToken } = await req.json();
    let token = providedToken; // MAY be missing

    if (!uuid) {
      return new Response(JSON.stringify({ error: 'UUID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // STEP 1: Always fetch the report row by UUID (no token required here)
    console.log(`🔍 Fetching temp_report_data for uuid=${uuid}...`);
    
    const { data, error } = await supabase
      .from('temp_report_data')
      .select('*')
      .eq('id', uuid)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      console.log('❌ Report data not found or expired');
      return new Response(JSON.stringify({ error: 'Report not found or expired' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // STEP 2: If no token is provided, generate a new one and overwrite any existing token_hash
    if (!token) {
      console.log('🔐 No token provided - generating new token and overwriting existing token_hash...');
      token = generateToken();
      const tokenHash = await hashToken(token);

      const { error: updateError } = await supabase
        .from('temp_report_data')
        .update({ token_hash: tokenHash })
        .eq('id', uuid);

      if (updateError) {
        console.error('❌ Failed to store token hash:', updateError);
        return new Response(JSON.stringify({ error: 'Failed to generate access token' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('✅ New token generated and stored');
    }

    // STEP 3: If token is still missing, reject
    if (!token) {
      console.log('❌ Token required for access (token_hash exists)');
      return new Response(JSON.stringify({ error: 'Token required for access' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // STEP 4: Validate token matches stored hash
    const tokenHash = await hashToken(token);
    if (data.token_hash !== tokenHash) {
      console.log('❌ Token validation failed');
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Secure report access granted');

    return new Response(JSON.stringify({
      report_content: data.report_content,
      swiss_data: data.swiss_data,
      metadata: data.metadata,
      uuid,
      token,
      chat_hash: data.chat_hash,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 retrieve-temp-report error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
