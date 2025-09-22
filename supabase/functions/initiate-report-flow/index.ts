// latest 

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

/// ---- Config / helpers -------------------------------------------------------

const SITE_URL = Deno.env.get('SITE_URL') || 'https://therai.co';
const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOG_LEVEL = Deno.env.get('LOG_LEVEL') ?? 'info';
const debug = (...a: any[]) => (LOG_LEVEL === 'debug' ? console.log(...a) : void 0);

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "600",
};

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const ok = (p: unknown) => json(200, p);
const bad = (m: string) => json(400, { error: m });
const forbid = (m: string) => json(403, { error: m });
const oops = (m: string) => json(500, { error: m });
const r2 = (n: number) => Math.round(n * 100) / 100;

// ---- Types ------------------------------------------------------------------

interface ReportData {
  reportType: string
  request?: string
  relationshipType?: string
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
  priceId?: string
  isAstroOnly?: boolean
}

interface TrustedPricing {
  valid: boolean
  promo_code_id?: string
  discount_usd: number
  trusted_base_price_usd: number
  final_price_usd: number
  report_type: string
  reason?: string
}

interface InitiateReportFlowRequest {
  reportData: ReportData
  trustedPricing: TrustedPricing
}

// ---- Handler ----------------------------------------------------------------

serve(async (req) => {
  // Preflight first
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const start = Date.now();
  
  // Performance logging - identify calling component
  const userAgent = req.headers.get('user-agent') || '';
  const referer = req.headers.get('referer') || '';
  console.log('🚀 [PERF] Request started', {
    timestamp: new Date().toISOString(),
    userAgent: userAgent.substring(0, 100),
    referer,
    isMobile: /mobile|android|iphone/i.test(userAgent)
  });

  // Parse JSON safely
  let body: any = null;
  try { body = await req.json(); } catch { /* noop */ }
  if (!body) return bad('Invalid JSON body');

  // Warm-up short path
  if (body?.warm === true) return ok({ warm: true });

  try {
    const { reportData, trustedPricing }: InitiateReportFlowRequest = body;
    
    // Component identification logging
    console.log('🎯 [PERF] Payload received', {
      timestamp: new Date().toISOString(),
      email: reportData?.email,
      reportType: reportData?.reportType,
      payloadSize: JSON.stringify(body).length,
      hasSecondPerson: !!(reportData?.secondPersonName),
      componentSource: body?.componentSource || 'unknown'
    });
    
    debug('[initiate-report-flow] Received payload', {
      reportData,
      trustedPricing,
      is_guest: body?.is_guest,
    });
    if (!reportData?.email || !trustedPricing) return bad('Missing required report data or trusted pricing');

    // 1) Kick off both reads in parallel (before any awaits)
    const pricePromise = supabaseAdmin
      .from('price_list')
      .select('id, unit_price_usd, is_ai')
      .eq('id', trustedPricing.report_type)
      .single();

    const promoPromise = trustedPricing.promo_code_id
      ? supabaseAdmin
          .from('promo_codes')
          .select('discount_percent')
          .eq('id', trustedPricing.promo_code_id)
          .eq('is_active', true)
          .single()
      : Promise.resolve({ data: null, error: null } as const);

    // 2) Do cheap CPU work (normalization) while network calls are running
    const guestReportId = crypto.randomUUID();
    const smartRequest = reportData.reportType?.split('_')[0] || (reportData as any).request || 'essence';
    const rqLower = String(smartRequest).toLowerCase();

    const normalizedReportData: any = {
      ...reportData,
      request: smartRequest,
      product_id: trustedPricing.report_type,
    };

    if (["sync", "compatibility", "synastry"].includes(rqLower)) {
      normalizedReportData.person_a = {
        birth_date: (reportData as any).birth_date || reportData.birthDate || null,
        birth_time: (reportData as any).birth_time || reportData.birthTime || null,
        location: (reportData as any).location || reportData.birthLocation || "",
        latitude: (reportData as any).latitude ?? reportData.birthLatitude ?? null,
        longitude: (reportData as any).longitude ?? reportData.birthLongitude ?? null,
        tz: (reportData as any).tz || (reportData as any).timezone || "",
        name: (reportData as any).name || "",
        house_system: (reportData as any).house_system || (reportData as any).hsys || "",
      };
      normalizedReportData.person_b = {
        birth_date: (reportData as any).second_person_birth_date || (reportData as any).secondPersonBirthDate || null,
        birth_time: (reportData as any).second_person_birth_time || (reportData as any).secondPersonBirthTime || null,
        location: (reportData as any).second_person_location || (reportData as any).secondPersonBirthLocation || "",
        latitude: (reportData as any).second_person_latitude ?? (reportData as any).secondPersonLatitude ?? null,
        longitude: (reportData as any).second_person_longitude ?? (reportData as any).secondPersonLongitude ?? null,
        tz: (reportData as any).second_person_tz || (reportData as any).secondPersonTimezone || "",
        name: (reportData as any).second_person_name || (reportData as any).secondPersonName || "",
        house_system: (reportData as any).second_person_house_system || "",
      };
    }

    debug('[initiate-report-flow] Normalized report data', normalizedReportData);

    // 3) Now await both results together
    const [{ data: priceData, error: priceError }, { data: promoData, error: promoError }] =
      await Promise.all([pricePromise, promoPromise]);

    if (priceError || !priceData) return forbid('Price validation failed');
    if (priceData.is_ai == null) return oops('Product configuration error: is_ai field not set');
    if (promoError) return forbid('Promo code validation failed');

    const base = Number(priceData.unit_price_usd);
    const pct = promoData?.discount_percent ?? 0;
    const final = r2(Math.max(0, base - r2(base * pct / 100)));
    if (final !== Number(trustedPricing.final_price_usd)) return forbid('Pricing mismatch detected');

    const isFreeReport = final === 0;
    const isAI = priceData.is_ai;

    // 4) Generate chat_id for secure guest chat sessions (use regular UUID)
    const chatId = crypto.randomUUID();
    
    // 5) Upsert with minimal returning (still awaited)
    const guestReportData = {
      id: guestReportId,
      user_id: null, // anonymous
      stripe_session_id: guestReportId,
      email: reportData.email,
      report_type: reportData.reportType || normalizedReportData.request || trustedPricing.report_type,
      amount_paid: final,
      report_data: normalizedReportData,
      payment_status: isFreeReport ? "paid" : "pending",
      purchase_type: 'report',
      promo_code_used: trustedPricing.promo_code_id || null,
      email_sent: false,
      is_ai_report: isAI,
      chat_id: chatId // 🔒 Secure chat_id generated by backend
    };

    const { error: insertError } = await supabaseAdmin
      .from("guest_reports")
      .upsert(guestReportData, { onConflict: 'id', returning: 'minimal' });
    if (insertError) return oops('Failed to create report record');

    const ms = Date.now() - start;

    if (isFreeReport) {
      console.log('✅ [PERF] Free report initiated', {
        timestamp: new Date().toISOString(),
        guestReportId,
        processing_time_ms: ms,
        reportType: reportData.reportType
      });

      return ok({
        guestReportId,
        chatId, // 🔒 Secure chat_id for frontend
        paymentStatus: 'paid',
        name: reportData.name,
        email: reportData.email,
        processing_time_ms: ms
      });
    } else {
      // For paid reports, create a payment intent for custom embedded checkout
      const paymentIntentPayload = {
        amount: final,
        currency: 'usd',
        guest_id: guestReportId,
        chat_id: chatId,
        description: `Astrology Report: ${reportData.reportType}`,
      };
      
      const { data: paymentIntentData, error: paymentIntentError } = await supabaseAdmin.functions.invoke('create-payment-intent', {
        body: paymentIntentPayload,
      });

      if (paymentIntentError || !paymentIntentData?.client_secret) {
        console.error('❌ [ERROR] Failed to create payment intent:', { 
          paymentIntentError, 
          paymentIntentData, 
          guestReportId,
          finalPrice: final,
          reportType: reportData.reportType,
          email: reportData.email
        });
        return oops('Failed to create payment intent');
      }

      // Create custom checkout URL for embedded checkout (include report type for UI summary)
      const reportParam = encodeURIComponent(reportData.reportType || normalizedReportData.request || 'report');
      const embeddedCheckoutUrl = `${SITE_URL}/stripe?amount=${final}&guest_id=${guestReportId}&chat_id=${chatId}&report=${reportParam}`;

      // Save checkout URL to guest_reports table (fire-and-forget)
      supabaseAdmin
        .from('guest_reports')
        .update({ checkout_url: embeddedCheckoutUrl })
        .eq('id', guestReportId)
        .then(({ error }) => {
          if (error) {
            console.error('❌ [ERROR] Failed to save checkout URL to guest_reports:', error);
          } else {
            console.log('✅ [SUCCESS] Checkout URL saved to guest_reports:', embeddedCheckoutUrl);
          }
        })
        .catch(err => console.error('❌ [ERROR] Exception saving checkout URL:', err));

      console.log('💳 [PERF] Paid report payment intent created', {
        timestamp: new Date().toISOString(),
        guestReportId,
        embeddedCheckoutUrl,
        finalPrice: final,
        reportType: reportData.reportType,
        processing_time_ms: ms
      });

      return ok({
        guestReportId,
        chatId, // 🔒 Secure chat_id for frontend
        paymentStatus: 'pending',
        checkoutUrl: embeddedCheckoutUrl, // Custom embedded checkout URL
        name: reportData.name,
        email: reportData.email,
        processing_time_ms: ms
      });
    }
  } catch (err: any) {
    debug('Unhandled flow error:', err?.message || err);
    return oops(err?.message || 'Internal server error');
  }
});

