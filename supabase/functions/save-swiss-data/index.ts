import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  uuid: string;
  swiss_data: any;
  table?: string;
  field?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { uuid, swiss_data, table = 'temp_report_data', field = 'swiss_data' }: RequestBody = await req.json();

    // Validate input
    if (!uuid || !swiss_data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: uuid and swiss_data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Saving enriched Swiss data for UUID:', uuid);

    // First get current attempts count
    const { data: currentData } = await supabase
      .from(table)
      .select('swiss_data_save_attempts')
      .eq('guest_report_id', uuid)
      .single();

    const currentAttempts = currentData?.swiss_data_save_attempts || 0;

    // Set pending flag and increment attempts
    const { error: updatePendingError } = await supabase
      .from(table)
      .update({ 
        swiss_data_save_pending: true,
        swiss_data_save_attempts: currentAttempts + 1,
        last_save_attempt_at: new Date().toISOString()
      })
      .eq('guest_report_id', uuid);

    if (updatePendingError) {
      console.error('Failed to set pending flag:', updatePendingError);
    }

    // Update the record with Swiss data and mark as saved
    const { data, error } = await supabase
      .from(table)
      .update({ 
        [field]: swiss_data,
        swiss_data_saved: true,
        swiss_data_save_pending: false
      })
      .eq('guest_report_id', uuid)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save data', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});