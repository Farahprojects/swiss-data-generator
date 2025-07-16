import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Set CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

// Serve the Edge Function
Deno.serve(async (req) => {
  console.log('📥 [save-swiss-data] Edge function called');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { uuid, swiss_data, table = 'temp_report_data', field = 'swiss_data' } = await req.json()
    
    console.log('📨 Parsed body:', { uuid, table, field, hasSwissData: !!swiss_data });

    if (!uuid || !swiss_data || !table || !field) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing uuid, swiss_data, table, or field' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log('📝 Attempting to update Swiss data for temp_report_data.id:', uuid)

    const { data, error } = await supabase
      .from(table)
      .update({ 
        [field]: swiss_data,
        swiss_data_saved: true,
        swiss_data_save_pending: false
      })
      .eq('id', uuid)
      .select('id')

    if (error) {
      console.error('❌ DB update failed:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No rows matched for id:', uuid)
      return new Response(
        JSON.stringify({ success: false, error: 'No matching row found' }),
        { status: 404, headers: corsHeaders }
      )
    }

    console.log('✅ DB update succeeded:', data)

    return new Response(
      JSON.stringify({
        success: true,
        updated: data[0],
        temp_report_data_id: uuid
      }),
      { status: 200, headers: corsHeaders }
    )

  } catch (err) {
    console.error('💥 Uncaught error in save-swiss-data:', err)
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown server error'
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})
