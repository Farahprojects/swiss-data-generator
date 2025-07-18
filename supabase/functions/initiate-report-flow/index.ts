
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

// Inline CORS utilities to avoid import issues
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
}

// Handle CORS preflight requests
const handleCors = (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  return null;
}

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

// Extract the exact getProductId logic from frontend usePriceFetch.ts
const getProductId = (data: ReportData): string => {
  // Prioritize direct reportType for unified mobile/desktop behavior
  if (data.reportType) {
    return data.reportType;
  }
  
  // Fallback to request field for astro data
  if (data.request) {
    return data.request;
  }
  
  // Legacy fallback for form combinations (desktop compatibility)
  if (data.essenceType && data.reportCategory === 'the-self') {
    return `essence_${data.essenceType}`;
  }
  
  if (data.relationshipType && data.reportCategory === 'compatibility') {
    return `sync_${data.relationshipType}`;
  }
  
  // If still no priceId, use default fallback
  return 'essence_personal'; // Default fallback
};

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
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
    
    // Determine priceId using the exact same logic as frontend
    let priceId = reportData.priceId
    if (!priceId) {
      priceId = getProductId(reportData);
    }

    // Fetch the base price from the database (SERVER-SIDE)
    const { data: product, error: productError } = await supabaseAdmin
      .from('price_list')
      .select('id, unit_price_usd, name, description')
      .eq('id', priceId)
      .single()

    if (productError || !product) {
      console.error('Product lookup failed:', { priceId, productError });
      return new Response(JSON.stringify({ 
        error: 'Product not found or invalid report type',
        debug: { priceId, productError: productError?.message }
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

    // --- PAID FLOW: STAGE 1 SERVER STATE ARCHITECTURE ---
    
    const originalAmount = product.unit_price_usd
    const discountAmount = originalAmount * (discountPercent / 100)
    const finalAmount = Math.max(originalAmount - discountAmount, 1) // Ensure minimum $1

    console.log('💰 Pricing calculation:', {
      original: originalAmount,
      discount: discountPercent,
      final: finalAmount,
      priceId,
      promoCode: promoCode || 'none'
    });

    // STAGE 1: Create guest_reports row IMMEDIATELY with pending status
    const guestReportData = {
      stripe_session_id: `temp_${Date.now()}`, // Temporary ID, will be updated after Stripe session creation
      email: reportData.email,
      report_type: reportData.reportType || null,
      amount_paid: finalAmount,
      report_data: {
        ...reportData,
        product_id: priceId, // Store product_id in database
      },
      payment_status: "pending",
      purchase_type: 'report',
      promo_code_used: promoCode || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("📝 Creating guest_reports row with pending status:", {
      email: reportData.email,
      amount: finalAmount,
      product_id: priceId,
      promoCode: promoCode || 'none'
    });

    // Create the guest_reports row first
    const { data: guestReport, error: insertError } = await supabaseAdmin
      .from("guest_reports")
      .insert(guestReportData)
      .select()
      .single();

    if (insertError) {
      console.error("❌ Failed to create guest_reports row:", insertError);
      return new Response(JSON.stringify({ 
        error: `Database error: ${insertError.message}` 
      }), {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log("✅ Created guest_reports row:", guestReport.id);

    // Now create checkout session with minimal data
    const checkoutData = {
      guest_report_id: guestReport.id,
      amount: finalAmount,
      email: reportData.email,
      description: product.description || `${product.name} Report`,
      successUrl: `${req.headers.get("origin")}/payment-return?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${req.headers.get("origin")}/payment-return?status=cancelled`,
    };

    console.log("💳 Creating checkout session with minimal data:", {
      guest_report_id: guestReport.id,
      amount: finalAmount,
      email: reportData.email,
      description: checkoutData.description
    });

    const { data: stripeResult, error: checkoutError } = await supabaseAdmin.functions.invoke(
      'create-checkout',
      { body: checkoutData }
    );

    if (checkoutError) {
      console.error("❌ Checkout error:", checkoutError);
      // Clean up the guest_reports row if checkout fails
      await supabaseAdmin
        .from("guest_reports")
        .delete()
        .eq("id", guestReport.id);
      return new Response(JSON.stringify({ 
        error: `Failed to create checkout: ${checkoutError.message}` 
      }), {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!stripeResult?.url) {
      await supabaseAdmin
        .from("guest_reports")
        .delete()
        .eq("id", guestReport.id);
      return new Response(JSON.stringify({ 
        error: 'No checkout URL returned from create-checkout' 
      }), {
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update the guest_reports row with the real Stripe session ID
    await supabaseAdmin
      .from("guest_reports")
      .update({ stripe_session_id: stripeResult.sessionId })
      .eq("id", guestReport.id);

    console.log("✅ Updated guest_reports with Stripe session ID:", stripeResult.sessionId);

    // Return the checkout URL and guest_report_id for tracking
    return new Response(JSON.stringify({
      status: 'payment_required',
      stripeUrl: stripeResult.url,
      sessionId: stripeResult.sessionId,
      guest_report_id: guestReport.id,
      finalAmount: finalAmount,
      description: checkoutData.description,
      debug: {
        originalPrice: originalAmount,
        discountApplied: discountPercent,
        product_id: priceId,
        guest_reports_created: true,
        promoCodeUsed: promoCode || 'none'
      }
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
