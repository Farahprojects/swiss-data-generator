import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

interface ReportData {
  reportType: string
  request?: string
  relationshipType?: string
  essenceType?: string
  name: string
  email: string
  birthDate: string
  birthTime: string
  birthLocation: string
  birthLatitude?: number
  birthLongitude?: number
  birthPlaceId?: string
  secondPersonName?: string
  secondPersonBirthDate?: string
  secondPersonBirthTime?: string
  secondPersonBirthLocation?: string
  secondPersonLatitude?: number
  secondPersonLongitude?: number
  secondPersonPlaceId?: string
  returnYear?: string
  notes?: string
}

interface InitiateReportFlowRequest {
  reportData: ReportData
  promoCode?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { reportData, promoCode }: InitiateReportFlowRequest = await req.json()
    
    if (!reportData || !reportData.email) {
      return new Response(JSON.stringify({ 
        error: 'Missing required report data or email' 
      }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // --- START OF CONSOLIDATED LOGIC ---
    
    let isFreeReport = false
    let promoId: string | null = null
    let amountPaid = 0

    // 1. VALIDATE PROMO CODE (if provided)
    if (promoCode && promoCode.trim()) {
      const { data: promo, error: promoError } = await supabaseAdmin
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.trim().toUpperCase())
        .eq('is_active', true)
        .single()

      if (promoError || !promo) {
        return new Response(JSON.stringify({ 
          error: 'Invalid or expired promo code' 
        }), {
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Check usage limits
      if (promo.max_uses && promo.times_used >= promo.max_uses) {
        return new Response(JSON.stringify({ 
          error: 'This promo code has reached its usage limit' 
        }), {
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // 2. SERVER-SIDE DECISION: Is this a 100% discount?
      if (promo.discount_percent === 100) {
        isFreeReport = true
        promoId = promo.id
        amountPaid = 0
      } else {
        // Partial discount - we'll handle paid reports later
        return new Response(JSON.stringify({ 
          error: 'This promo code requires payment' 
        }), {
          status: 402, // Payment Required
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // 3. INSERT the report record
    const sessionId = isFreeReport 
      ? `free_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      : `paid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

    const insertPayload = {
      stripe_session_id: sessionId,
      email: reportData.email,
      report_type: reportData.reportType || 'standard',
      report_data: reportData,
      amount_paid: amountPaid,
      payment_status: isFreeReport ? 'paid' : 'pending',
      promo_code_used: promoCode || null,
      has_report: false,
      email_sent: false,
      coach_id: null,
      translator_log_id: null,
      report_log_id: null
    }

    const { data: guestReport, error: insertError } = await supabaseAdmin
      .from('guest_reports')
      .insert(insertPayload)
      .select('id')
      .single()

    if (insertError) {
      console.error('Failed to insert guest report:', insertError)
      return new Response(JSON.stringify({ 
        error: 'Failed to create report record' 
      }), {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. INCREMENT promo code usage (if free report)
    if (isFreeReport && promoId) {
      await supabaseAdmin
        .from('promo_codes')
        .update({ times_used: (await supabaseAdmin
          .from('promo_codes')
          .select('times_used')
          .eq('id', promoId)
          .single()).data?.times_used + 1 })
        .eq('id', promoId)
    }

    // 5. TRIGGER the background generation process
    if (isFreeReport) {
      // For free reports, trigger report generation immediately
      const { error: verifyError } = await supabaseAdmin.functions.invoke(
        'verify-guest-payment',
        { body: { sessionId } }
      )
      
      if (verifyError) {
        console.error('Failed to trigger report generation:', verifyError)
        // Don't fail the request - the report can be generated later
      }
    }

    // 6. RESPOND to the client with success
    return new Response(JSON.stringify({ 
      status: 'success', 
      message: isFreeReport 
        ? 'Your free report is being generated' 
        : 'Redirecting to payment',
      reportId: guestReport.id,
      sessionId,
      isFreeReport
    }), {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in initiate-report-flow:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}) 