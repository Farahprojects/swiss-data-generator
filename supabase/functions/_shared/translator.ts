
// supabase/functions/_shared/translator.ts
//
// ▸ 2025-06-16 patch v2.1 - LATEST VERSION DEBUG
//   • removed undefined `raw` reference in logger
//   • logger now accepts optional `translatorPayload` so you can see the
//     exact JSON forwarded to Swiss
//   • every call supplies that payload where it exists
//   • small typographical tidy-ups (no functional change elsewhere)
//   • added version debug logging
// ---------------------------------------------------------------------------

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleReportGeneration } from "./reportHandler.ts";

/*──────────────── ENV ------------------------------------*/
const SWISS_API = Deno.env.get("SWISS_EPHEMERIS_URL")!;
const SB_URL    = Deno.env.get("SUPABASE_URL")!;
const SB_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEO_KEY   = Deno.env.get("GOOGLE_API_KEY")!;
const GEO_TAB   = Deno.env.get("GEOCODE_CACHE_TABLE") ?? "geo_cache";
const GEO_TTL   = +(Deno.env.get("GEOCODE_TTL_MIN") ?? "1440");

const sb = createClient(SB_URL, SB_KEY);

// Version identifier for debugging
const TRANSLATOR_VERSION = "2025-06-16-v2.1-LATEST";

/*──────────────── UUID validation helper ──────────────────────────────────*/
function isValidUUID(val: string | null | undefined): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

/*──────────────── canonical maps ------------------------ */
const CANON: Record<string, string> = {
  natal:         "natal",
  transits:      "transits",
  progressions:  "progressions",
  return:        "return",
  synastry:      "synastry",
  compatibility: "synastry",
  positions:     "positions",
  moonphases:    "moonphases",
  body:          "body_matrix",
  body_matrix:   "body_matrix",
  sync:          "sync",
  reports:       "reports",   // tracking-only
  /* ========= NEW ENDPOINTS (user-friendly aliases) ===== */
  essence:       "essence",   // natal + current transits bundle
  flow:          "flow",
  mindset:       "mindset",
  monthly:       "monthly",
  focus:         "focus",
};

/*──────────────── misc maps */
const HOUSE_ALIASES: Record<string, string> = {
  placidus:     "P",
  koch:         "K",
  "whole-sign": "W",
  equal:        "A",
};

/*──────────────── schema */
const Base = z.object({ request: z.string().nonempty() }).passthrough();

/*──────────────── logger */
async function logToSupabase(
  requestType: string,
  requestPayload: any,
  responseStatus: number,
  responsePayload: any,
  processingTime: number,
  errorMessage?: string,
  googleGeoUsed = false,
  userId?: string,
  translatorPayload?: any,        // NEW – what we sent to Swiss
) {
  const reportTier =
    requestPayload?.report ??
    requestPayload?.report_type ??
    requestPayload?.reportType ??
    null;

  const isGuest = requestPayload?.is_guest === true;


  // [DEBUG] Log responsePayload structure before saving
  console.log('[translator] [DEBUG] responsePayload keys before saving:', Object.keys(responsePayload || {}));
  console.log('[translator] [DEBUG] responsePayload.swiss_data exists:', !!responsePayload?.swiss_data);
  console.log('[translator] [DEBUG] Swiss data keys being saved:', responsePayload?.swiss_data ? Object.keys(responsePayload.swiss_data) : 'null');
  
  // ⭐ [TRANSLATOR] Inserting into translator_logs
  console.log('⭐ [TRANSLATOR] insert', {
    user_id: userId,
    user_id_type: typeof userId,
    user_id_value: userId,
    is_guest: isGuest,
    request_type: requestType,
    has_swiss_data: !!responsePayload?.swiss_data,
    file: "translator.ts:98",
    function: "logToSupabase",
    translator_payload_keys: translatorPayload ? Object.keys(translatorPayload) : null
  });

  const insertData = {
    request_type:        requestType,
    request_payload:     requestPayload,
    translator_payload:  translatorPayload ?? null,
    response_status:     responseStatus,
    swiss_data:          responsePayload ?? null, // store the full Swiss response
    processing_time_ms:  processingTime,
    error_message:       errorMessage,
    google_geo:          googleGeoUsed,
    report_tier:         reportTier,
    user_id: isValidUUID(userId) ? userId.toString().trim() : null, // translator.ts – inside insertData object
    is_guest:            isGuest,
  };

  console.log('⭐ [TRANSLATOR] insert_data', {
    user_id: insertData.user_id,
    user_id_type: typeof insertData.user_id,
    is_guest: insertData.is_guest,
    request_type: insertData.request_type,
    file: "translator.ts:115",
    function: "logToSupabase"
  });

  const { error } = await sb.from("translator_logs").insert(insertData);
  
  if (error) {
    console.error("⭐ [TRANSLATOR] insert_failed:", error.message);
  } else {
    console.log('⭐ [TRANSLATOR] insert_success', { 
      user_id: userId,
      user_id_type: typeof userId,
      file: "translator.ts:125",
      function: "logToSupabase"
    });
  }
}

/*──────────────── helpers */
async function ensureLatLon(
  obj: any,
): Promise<{ data: any; googleGeoUsed: boolean }> {
  if (
    (obj.latitude !== undefined && obj.longitude !== undefined) ||
    !obj.location
  ) return { data: obj, googleGeoUsed: false };

  const place = String(obj.location).trim();
  let googleGeoUsed = true;

  /* ---------- cache first ---------- */
  const { data } = await sb
    .from(GEO_TAB)
    .select("lat,lon,updated_at")
    .eq("place", place)
    .maybeSingle();

  if (data) {
    const age = (Date.now() - Date.parse(data.updated_at)) / 60000;
    if (age < GEO_TTL) {
      return {
        data: { ...obj, latitude: data.lat, longitude: data.lon },
        googleGeoUsed: true,
      };
    }
  }

  /* ---------- Google fallback ---------- */
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      place,
    )}&key=${GEO_KEY}`;
  const g = await fetch(url).then((r) => r.json());
  if (g.status !== "OK") throw new Error(`Geocode failed: ${g.status}`);

  const { lat, lng } = g.results[0].geometry.location;
  await sb.from(GEO_TAB).upsert({ place, lat, lon: lng });

  return {
    data: { ...obj, latitude: lat, longitude: lng },
    googleGeoUsed: true,
  };
}

function normalise(p: any) {
  const out = { ...p };

  if (out.system && out.sidereal === undefined) {
    out.sidereal = out.system.toLowerCase() === "vedic";
  }

  if (out.house && !out.settings?.house_system) {
    const letter = HOUSE_ALIASES[out.house.toLowerCase()];
    if (letter) out.settings = { ...(out.settings ?? {}), house_system: letter };
  }

  if (out.house_system && !out.settings?.house_system) {
    const letter = HOUSE_ALIASES[out.house_system.toLowerCase()] ??
      out.house_system;
    out.settings = { ...(out.settings ?? {}), house_system: letter };
    delete out.house_system;
  }
  return out;
}

/*──────────────── translate */
export async function translate(
  raw: any,
): Promise<{ status: number; text: string }> {
  const startTime     = Date.now();
  let   requestType   = "unknown";
  let   googleGeoUsed = false;
  const userId        = raw.user_id;
  const skipLogging   = raw.skip_logging === true;
  const requestId     = crypto.randomUUID().substring(0, 8);

  // VERSION DEBUG LOG - This will appear in edge function logs
  console.log(`[translator][${requestId}] ✅ TRANSLATOR VERSION: ${TRANSLATOR_VERSION} - LATEST FILE LOADED`);

  try {
    const body = Base.parse(raw);
    requestType = body.request.trim().toLowerCase();
    const canon = CANON[requestType];

    if (!canon) {
      const err = `Unknown request ${body.request}`;
      if (!skipLogging) {
        await logToSupabase(
          requestType,
          raw,
          400,
          { error: err },
          Date.now() - startTime,
          err,
          googleGeoUsed,
          userId,
        );
      }
      return { status: 400, text: JSON.stringify({ error: err }) };
    }

    requestType = canon;

    /*──────────────── REPORTS (tracking-only) ─────────────*/
    if (canon === "reports") {
      const msg = "Reports request logged";
      if (!skipLogging) {
        await logToSupabase(
          requestType,
          raw,
          200,
          { message: msg },
          Date.now() - startTime,
          undefined,
          googleGeoUsed,
          userId,
        );
      }
      return { status: 200, text: JSON.stringify({ message: msg }) };
    }

    /*──────────────── SYNC ───────────────────────────────*/
    if (canon === "sync") {
      if (!body.person_a || !body.person_b) {
        const err = "person_a & person_b required";
        if (!skipLogging) {
          await logToSupabase(
            requestType,
            raw,
            400,
            { error: err },
            Date.now() - startTime,
            err,
            googleGeoUsed,
            userId,
          );
        }
        return { status: 400, text: JSON.stringify({ error: err }) };
      }

      const { data: pa, googleGeoUsed: gA } = await ensureLatLon(body.person_a);
      const { data: pb, googleGeoUsed: gB } = await ensureLatLon(body.person_b);
      googleGeoUsed = gA || gB;

      const payload = { person_a: normalise(pa), person_b: normalise(pb) };

      console.log(`[translator][${requestId}] POST /sync`);
      const r   = await fetch(`${SWISS_API}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:   JSON.stringify(payload),
      });
      const txt = await r.text();

      const reportResult = await handleReportGeneration({
        requestData: raw,
        swissApiResponse: txt,
        swissApiStatus: r.status,
        requestId,
      });

      const finalData  = reportResult.responseData;
      
      // [DEBUG] Verify finalData.swiss_data exists after handleReportGeneration
      console.log(`[translator][${requestId}] [DEBUG] finalData keys after handleReportGeneration:`, Object.keys(finalData || {}));
      console.log(`[translator][${requestId}] [DEBUG] finalData.swiss_data exists:`, !!finalData?.swiss_data);
      
      const finalError = reportResult.errorMessage || (!r.ok
        ? `Swiss API returned ${r.status}`
        : undefined);

      if (!skipLogging) {
        await logToSupabase(
          requestType,
          raw,
          r.status,
          (() => { try { return JSON.parse(typeof finalData === "string" ? finalData : JSON.stringify(finalData)); } catch { return { raw_response: finalData }; } })(),
          Date.now() - startTime,
          finalError,
          googleGeoUsed,
          userId,
          payload,                 // what we sent to Swiss
        );
      }

      return {
        status: r.status,
        text: typeof finalData === "string" ? finalData : JSON.stringify(finalData),
      };
    }

    /*──────────────── simple GETs ─────────────────────────*/
    if (canon === "moonphases") {
      const year = body.year ?? new Date().getFullYear();
      console.log(`[translator][${requestId}] GET /moonphases`);
      const r   = await fetch(`${SWISS_API}/moonphases?year=${year}`);
      const txt = await r.text();

      // [REPORT-HANDLER-MOONPHASES] Processing report data in moonphases
      console.log(`[translator][${requestId}] [REPORT-HANDLER-MOONPHASES] Processing report data in moonphases - Line 314`);
      console.log(`[translator][${requestId}] [REPORT-HANDLER-MOONPHASES] Raw swiss response preview:`, txt.substring(0, 200));
      
      const reportResult = await handleReportGeneration({
        requestData: raw,
        swissApiResponse: txt,
        swissApiStatus: r.status,
        requestId,
      });

      const finalData  = reportResult.responseData;
      
      // [DEBUG] Verify finalData.swiss_data exists after handleReportGeneration
      console.log(`[translator][${requestId}] [DEBUG] finalData keys after handleReportGeneration:`, Object.keys(finalData || {}));
      console.log(`[translator][${requestId}] [DEBUG] finalData.swiss_data exists:`, !!finalData?.swiss_data);
      
      const finalError = reportResult.errorMessage || (!r.ok
        ? `Swiss API returned ${r.status}`
        : undefined);

      if (!skipLogging) {
        await logToSupabase(
          requestType,
          raw,
          r.status,
          (() => { try { return JSON.parse(typeof finalData === "string" ? finalData : JSON.stringify(finalData)); } catch { return { raw_response: finalData }; } })(),
          Date.now() - startTime,
          finalError,
          googleGeoUsed,
          userId,
          undefined, // no translator payload for simple GET
        );
      }
      return {
        status: r.status,
        text: typeof finalData === "string" ? finalData : JSON.stringify(finalData),
      };
    }

    if (canon === "positions") {
      const qs = new URLSearchParams({
        utc:      body.utc ?? new Date().toISOString(),
        sidereal: String(body.sidereal ?? false),
      });
      console.log(`[translator][${requestId}] GET /positions`);
      const r   = await fetch(`${SWISS_API}/positions?${qs}`);
      const txt = await r.text();

      // [REPORT-HANDLER-POSITIONS] Processing report data in positions
      console.log(`[translator][${requestId}] [REPORT-HANDLER-POSITIONS] Processing report data in positions - Line 354`);
      console.log(`[translator][${requestId}] [REPORT-HANDLER-POSITIONS] Raw swiss response preview:`, txt.substring(0, 200));
      
      const reportResult = await handleReportGeneration({
        requestData: raw,
        swissApiResponse: txt,
        swissApiStatus: r.status,
        requestId,
      });

      const finalData  = reportResult.responseData;
      
      // [DEBUG] Verify finalData.swiss_data exists after handleReportGeneration
      console.log(`[translator][${requestId}] [DEBUG] finalData keys after handleReportGeneration:`, Object.keys(finalData || {}));
      console.log(`[translator][${requestId}] [DEBUG] finalData.swiss_data exists:`, !!finalData?.swiss_data);
      
      const finalError = reportResult.errorMessage || (!r.ok
        ? `Swiss API returned ${r.status}`
        : undefined);

      if (!skipLogging) {
        await logToSupabase(
          requestType,
          raw,
          r.status,
          (() => { try { return JSON.parse(typeof finalData === "string" ? finalData : JSON.stringify(finalData)); } catch { return { raw_response: finalData }; } })(),
          Date.now() - startTime,
          finalError,
          googleGeoUsed,
          userId,
          undefined, // no translator payload for simple GET
        );
      }

      return {
        status: r.status,
        text: typeof finalData === "string" ? finalData : JSON.stringify(finalData),
      };
    }

    /*──────────────── POST chart routes ──────────────────*/
    const { data: enrichedRaw, googleGeoUsed: gUsed } = await ensureLatLon(body);
    googleGeoUsed = gUsed;

    const enriched = normalise(enrichedRaw);

    const path    = canon;
    console.log(`[translator][${requestId}] POST /${path}`);
    const r   = await fetch(`${SWISS_API}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:   JSON.stringify(enriched),
    });
    const txt = await r.text();

    // [REPORT-HANDLER-CHARTS] Processing report data in chart routes
    console.log(`[translator][${requestId}] [REPORT-HANDLER-CHARTS] Processing report data in chart routes (${path}) - Line 401`);
    console.log(`[translator][${requestId}] [REPORT-HANDLER-CHARTS] Raw swiss response preview:`, txt.substring(0, 200));
    
    const reportResult = await handleReportGeneration({
      requestData: raw,
      swissApiResponse: txt,
      swissApiStatus: r.status,
      requestId,
    });

    const finalData  = reportResult.responseData;
    
    // [DEBUG] Verify finalData.swiss_data exists after handleReportGeneration
    console.log(`[translator][${requestId}] [DEBUG] finalData keys after handleReportGeneration:`, Object.keys(finalData || {}));
    console.log(`[translator][${requestId}] [DEBUG] finalData.swiss_data exists:`, !!finalData?.swiss_data);
    
    const finalError = reportResult.errorMessage || (!r.ok
      ? `Swiss API returned ${r.status}`
      : undefined);

    if (!skipLogging) {
      await logToSupabase(
        requestType,
        raw,
        r.status,
        (() => { try { return JSON.parse(typeof finalData === "string" ? finalData : JSON.stringify(finalData)); } catch { return { raw_response: finalData }; } })(),
        Date.now() - startTime,
        finalError,
        googleGeoUsed,
        userId,
        enriched,                // exact payload sent to Swiss
      );
    }

    return {
      status: r.status,
      text: typeof finalData === "string" ? finalData : JSON.stringify(finalData),
    };
  } catch (err) {
    const msg = (err as Error).message;
    console.log(`[translator][${requestId}] ❌ ERROR: ${msg}`);
    if (!skipLogging) {
      await logToSupabase(
        requestType,
        raw,
        500,
        { error: msg },
        Date.now() - startTime,
        msg,
        googleGeoUsed,
        userId,
      );
    }
    return { status: 500, text: JSON.stringify({ error: msg }) };
  }
}
