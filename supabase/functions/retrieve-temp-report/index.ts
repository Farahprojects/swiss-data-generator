import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const uuid = url.searchParams.get('uuid');

    if (!uuid) {
      return new Response(JSON.stringify({ error: 'UUID parameter is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Retrieving temp report data for UUID:', uuid);

    // Retrieve the report data and check if it's not expired
    const { data, error } = await supabase
      .from('temp_report_data')
      .select('*')
      .eq('id', uuid)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      console.log('Report data not found or expired for UUID:', uuid);
      return new Response(JSON.stringify({ error: 'Report data not found or expired' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully retrieved temp report data for UUID:', uuid);

    return new Response(JSON.stringify({
      report_content: data.report_content,
      swiss_data: data.swiss_data,
      metadata: data.metadata,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in retrieve-temp-report function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});