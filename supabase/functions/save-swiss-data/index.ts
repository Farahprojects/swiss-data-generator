import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Set CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
}

// Serve the Edge Function
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { uuid, swiss_data, table = 'temp_report_data', field = 'swiss_data' } = await req.json()

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

    console.log('📝 Attempting to update enriched Swiss data for guest_report_id:', uuid)

    const { data, error } = await supabase
      .from(table)
      .update({ [field]: swiss_data })
      .eq('guest_report_id', uuid)
      .select()

    if (error) {
      console.error('❌ DB update error:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: corsHeaders }
      )
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No rows matched for guest_report_id:', uuid)
      return new Response(
        JSON.stringify({ success: false, error: 'No matching row found' }),
        { status: 404, headers: corsHeaders }
      )
    }

    console.log('✅ Swiss data updated successfully for guest_report_id:', uuid)

    return new Response(
      JSON.stringify({
        success: true,
        updated: data[0],
        guest_report_id: uuid
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
