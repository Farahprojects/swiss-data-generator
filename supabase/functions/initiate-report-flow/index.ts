import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

/// ---- Config / helpers -------------------------------------------------------

const SITE_URL = Deno.env.get('SITE_URL') || 'https://theraiastro.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOG_LEVEL = Deno.env.get('LOG_LEVEL') ?? 'info';
const debug = (...a: any[]) => (LOG_LEVEL === 'debug' ? console.log(...a) : void 0);

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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

  // Parse JSON safely
  let body: any = null;
  try { body = await req.json(); } catch { /* noop */ }
  if (!body) return bad('Invalid JSON body');

  // Warm-up short path
  if (body?.warm === true) return ok({ warm: true });

  try {
    const { reportData, trustedPricing }: InitiateReportFlowRequest = body;
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

    // 4) Upsert with minimal returning (still awaited)
    const guestReportData = {
      id: guestReportId,
      user_id: null, // anonymous
      stripe_session_id: guestReportId,
      email: reportData.email,
      report_type: reportData.reportType || 'essence_personal',
      amount_paid: final,
      report_data: normalizedReportData,
      payment_status: isFreeReport ? "paid" : "pending",
      purchase_type: 'report',
      promo_code_used: trustedPricing.promo_code_id || null,
      email_sent: false,
      is_ai_report: isAI
    };

    const { error: insertError } = await supabaseAdmin
      .from("guest_reports")
      .upsert(guestReportData, { onConflict: 'id', returning: 'minimal' });
    if (insertError) return oops('Failed to create report record');

    const ms = Date.now() - start;

    // 5) Free report → kick translator-edge and return
    if (isFreeReport) {
      const translatorPayload = {
        ...normalizedReportData,
        request: smartRequest,
        reportType: reportData.reportType,
        is_guest: true,
        is_ai_report: isAI,
        user_id: guestReportId,
        request_id: crypto.randomUUID().slice(0, 8),
        email: reportData.email,
        name: reportData.name,
      };
      debug('[initiate-report-flow] Translator-edge payload (free)', translatorPayload);
      void supabaseAdmin.functions.invoke('translator-edge', { body: translatorPayload });

      const reportUrl = `${SITE_URL}/report?guest_id=${guestReportId}&success=1`;
      return ok({
        guestReportId,
        user_id: null,
        finalPrice: final,
        isFreeReport: true,
        reportUrl,
        url: reportUrl,
        processing_time_ms: ms
      });
    }

    // 6) Paid report → create checkout
    try {
      const checkoutPayload = {
        guest_report_id: guestReportId,
        amount: final,
        email: reportData.email,
        description: "Astrology Report",
        successUrl: `${SITE_URL}/stripe-return?guest_id=${guestReportId}&session_id={CHECKOUT_SESSION_ID}&status=success`,
        cancelUrl: `${SITE_URL}/stripe-return?guest_id=${guestReportId}&status=cancelled`,
      };
      debug('[initiate-report-flow] create-checkout payload (paid)', checkoutPayload);
      const { data: checkoutData, error: checkoutError } = await supabaseAdmin.functions.invoke('create-checkout', {
        body: checkoutPayload,
      });

      if (checkoutError || !checkoutData?.url) return oops('Failed to create checkout session');

      return ok({
        guestReportId,
        user_id: null,
        finalPrice: final,
        isFreeReport: false,
        checkoutUrl: checkoutData.url,
        url: checkoutData.url,
        processing_time_ms: ms
      });
    } catch {
      return oops('Failed to create checkout session');
    }

  } catch (err: any) {
    debug('Unhandled flow error:', err?.message || err);
    return oops(err?.message || 'Internal server error');
  }
});
