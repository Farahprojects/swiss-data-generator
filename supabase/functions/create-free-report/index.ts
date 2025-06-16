
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { promoCode, reportData } = await req.json();
    
    console.log('🎫 Creating free report with promo code:', promoCode);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate promo code
    const { data: promoCodeData, error: promoError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode)
      .eq('is_active', true)
      .single();

    if (promoError || !promoCodeData) {
      console.error('❌ Invalid promo code:', promoCode);
      return new Response(
        JSON.stringify({ error: 'Invalid promo code' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if promo code is 100% discount
    if (promoCodeData.discount_percent !== 100) {
      console.error('❌ Promo code is not 100% discount:', promoCodeData.discount_percent);
      return new Response(
        JSON.stringify({ error: 'Promo code does not provide free access' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check usage limits
    if (promoCodeData.max_uses && promoCodeData.times_used >= promoCodeData.max_uses) {
      console.error('❌ Promo code usage limit exceeded');
      return new Response(
        JSON.stringify({ error: 'Promo code usage limit exceeded' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a unique session ID for tracking
    const sessionId = `free_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create guest report entry
    const { data: guestReport, error: reportError } = await supabase
      .from('guest_reports')
      .insert({
        stripe_session_id: sessionId,
        email: reportData.email,
        report_type: reportData.reportType,
        report_data: reportData,
        amount_paid: 0,
        payment_status: 'free',
        promo_code_used: promoCode,
        has_report: false,
        email_sent: false
      })
      .select()
      .single();

    if (reportError) {
      console.error('❌ Error creating guest report:', reportError);
      throw new Error('Failed to create report entry');
    }

    console.log('✅ Guest report created:', guestReport.id);

    // Update promo code usage count
    const { error: updateError } = await supabase
      .from('promo_codes')
      .update({ times_used: promoCodeData.times_used + 1 })
      .eq('id', promoCodeData.id);

    if (updateError) {
      console.error('⚠️ Warning: Failed to update promo code usage count:', updateError);
    }

    // Call the create-report function to generate the actual report
    const reportResponse = await supabase.functions.invoke('create-report', {
      body: {
        ...reportData,
        sessionId: sessionId,
        isGuestReport: true
      }
    });

    if (reportResponse.error) {
      console.error('❌ Error generating report:', reportResponse.error);
      // Update guest report with error status
      await supabase
        .from('guest_reports')
        .update({ 
          payment_status: 'failed',
          has_report: false 
        })
        .eq('id', guestReport.id);
      
      throw new Error('Failed to generate report');
    }

    console.log('✅ Free report created successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Free report created successfully',
        reportId: guestReport.id,
        sessionId: sessionId
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('❌ Error in create-free-report:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
