
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/utils.ts'

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
  reportCategory?: string
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
  priceId?: string
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

    // --- PRICE LOOKUP FROM DATABASE ---
    
    // Determine priceId based on report type if not explicitly provided
    let priceId = reportData.priceId
    if (!priceId) {
      // Use the exact same logic as the frontend's getProductId function
      // Prioritize direct reportType for unified mobile/desktop behavior
      if (reportData.reportType) {
        priceId = reportData.reportType;
      }
      
      // Fallback to request field for astro data
      if (!priceId && reportData.request) {
        priceId = reportData.request;
      }
      
      // Legacy fallback for form combinations (desktop compatibility)
      if (!priceId && reportData.essenceType && reportData.reportCategory === 'the-self') {
        priceId = `essence_${reportData.essenceType}`;
      }
      
      if (!priceId && reportData.relationshipType && reportData.reportCategory === 'compatibility') {
        priceId = `sync_${reportData.relationshipType}`;
      }
      
      // If still no priceId, use default fallback
      if (!priceId) {
        priceId = 'essence_personal'; // Default fallback
      }
    }

    // Fetch the base price from the database (SERVER-SIDE)
    const { data: product, error: productError } = await supabaseAdmin
      .from('price_list')
      .select('id, unit_price_usd, name, description')
      .eq('id', priceId)
      .single()

    if (productError || !product) {
      return new Response(JSON.stringify({ 
        error: 'Product not found or invalid report type' 
      }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let finalPrice = product.unit_price_usd
    let discountPercent = 0
    let validatedPromoId: string | null = null

    // --- PROMO CODE VALIDATION ---
    
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

      validatedPromoId = promo.id
      discountPercent = promo.discount_percent

      // FREE FLOW (100% discount) - existing tested logic
      if (discountPercent === 100) {
        const sessionId = `free_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

        const insertPayload = {
          stripe_session_id: sessionId,
          email: reportData.email,
          report_type: reportData.reportType || 'standard',
          report_data: reportData,
          amount_paid: 0,
          payment_status: 'paid',
          promo_code_used: promoCode,
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

        // Increment promo code usage
        await supabaseAdmin
          .from('promo_codes')
          .update({ 
            times_used: promo.times_used + 1 
          })
          .eq('id', validatedPromoId)

        // Trigger background generation
        const { error: verifyError } = await supabaseAdmin.functions.invoke(
          'verify-guest-payment',
          { body: { sessionId } }
        )
        
        if (verifyError) {
          console.error('Failed to trigger report generation:', verifyError)
        }

        return new Response(JSON.stringify({ 
          status: 'success', 
          message: 'Your free report is being generated',
          reportId: guestReport.id,
          sessionId,
          isFreeReport: true
        }), {
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // --- PAID FLOW: CALCULATE FINAL PRICE ---
    
    const discountAmount = finalPrice * (discountPercent / 100)
    finalPrice = finalPrice - discountAmount

    // Ensure minimum price (e.g., $1.00)
    if (finalPrice < 1) {
      finalPrice = 1
    }

    // Return pricing data for frontend to process with existing Stripe checkout
    return new Response(JSON.stringify({
      status: 'payment_required',
      finalAmount: finalPrice,
      description: product.description || `${product.name} Report`,
      productName: product.name,
      validatedPromoId,
      discountPercent,
      originalPrice: product.unit_price_usd,
      productId: product.id
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
