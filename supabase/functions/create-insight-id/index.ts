import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateInsightRequest {
  user_id: string;
  report_type: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, report_type }: CreateInsightRequest = await req.json()

    if (!user_id || !report_type) {
      return new Response(
        JSON.stringify({ error: 'user_id and report_type are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log(`[create-insight-id] Creating insight for user: ${user_id}, type: ${report_type}`)

    // Create new insight record
    const { data, error } = await supabase
      .from('insights')
      .insert({
        user_id,
        report_type,
        status: 'pending'
      })
      .select('id')
      .single()

    if (error) {
      console.error('[create-insight-id] Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create insight record' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const insightId = data.id
    console.log(`[create-insight-id] Created insight with ID: ${insightId}`)

    // Create conversation with the SAME ID so reportId === conversationId
    const { error: conversationError } = await supabase
      .from('conversations')
      .insert({
        id: insightId,
        user_id,
        title: 'New Insight Report',
        mode: 'insight',
        meta: { report_type }
      })

    if (conversationError) {
      console.error('[create-insight-id] Failed to create conversation:', conversationError)
      // Don't fail the request - insight was created successfully
      // The conversation can be created later if needed
    } else {
      console.log(`[create-insight-id] Created conversation with same ID: ${insightId}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        report_id: data.id,
        report_type,
        status: 'pending'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[create-insight-id] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
