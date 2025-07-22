
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*──────────────── ENV ------------------------------------------------------*/
const SWISS_API = Deno.env.get("SWISS_EPHEMERIS_URL")!;
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEO_KEY = Deno.env.get("GOOGLE_API_KEY")!;
const GEO_TTL_MIN = +(Deno.env.get("GEOCODE_TTL_MIN") ?? "1440");
const GEO_TABLE = Deno.env.get("GEOCODE_CACHE_TABLE") ?? "geo_cache";
const VERSION = "translator-edge v3.1 (2025‑07‑22)";

const sb = createClient(SB_URL, SB_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

/*──────────────────── schema & utils --------------------------------------*/
// Updated schema to handle both time and birth_time for backward compatibility
const baseSchema = z.object({
  request: z.string().nonempty(),

  // Date fields
  date: z.string().optional(), // YYYY‑MM‑DD
  birth_date: z.string().optional(), // YYYY‑MM‑DD

  // Time fields - accept both for backward compatibility
  time: z.string().optional(), // HH:MM (24‑h) - legacy
  birth_time: z.string().optional(), // HH:MM (24‑h) - preferred

  // Timezone
  tz: z.string().optional(), // IANA tz name e.g. "Australia/Melbourne"

  // Complete timestamp
  local: z.string().optional(), // ISO‑8601 with offset e.g. 1981‑07‑20T06:36:00+10:00

  // Location fields
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  location: z.string().optional(), // free‑form place name

  // Optional report routing & flags (left unchanged)
  report: z.string().optional(),
  is_guest: z.boolean().optional(),
  user_id: z.string().optional(),
  skip_logging: z.boolean().optional(),

  // Add support for all existing fields that might be passed
  name: z.string().optional(),
  person_a: z.any().optional(),
  person_b: z.any().optional(),
  year: z.number().optional(),
  return_date: z.string().optional(),
}).refine((v) => {
  // Accept if `local` is present (complete timestamp)
  if (v.local) return true;
  
  // Accept if we have proper birth date + time combination
  const hasDate = v.date || v.birth_date;
  const hasTime = v.time || v.birth_time;
  if (hasDate && hasTime) return true;
  
  // For some requests like moonphases, positions, we don't need birth time
  if (['moonphases', 'positions'].includes(v.request?.toLowerCase() || '')) return true;
  
  return false;
}, { 
  message: "You must provide either 'local', or ('date'/'birth_date' + 'time'/'birth_time') combination." 
});

/** Parse a resp ISO‑8601 or (date, time, tz?) combo → ISO‑UTC string. */
export function toUtcISO(parts: { date?: string; time?: string; tz?: string; local?: string; birth_date?: string; birth_time?: string; location?: string }): string {
  if (parts.local) {
    // Already ISO with offset – just convert to UTC
    const d = new Date(parts.local);
    if (isNaN(d.getTime())) throw new Error("Invalid 'local' timestamp");
    return d.toISOString();
  }

  // Handle birth_date format - now check if we also have time and location
  const actualDate = parts.birth_date || parts.date;
  const actualTime = parts.birth_time || parts.time;

  if (actualDate) {
    // If we have both birth_date and time, combine them with timezone
    if (actualTime && parts.location) {
      // Extract date from birth_date
      const birthDate = new Date(actualDate);
      if (isNaN(birthDate.getTime())) throw new Error("Invalid date timestamp");
      
      // Get date components
      const year = birthDate.getFullYear();
      const month = birthDate.getMonth(); // 0-based
      const day = birthDate.getDate();
      
      // Parse time
      const [H, M] = actualTime.split(":").map(Number);
      
      // Determine timezone - try to map location to IANA timezone
      let tz = parts.tz || "UTC";
      
      if (!parts.tz) {
        const location = parts.location.toLowerCase();
        
        // Common location to timezone mappings
        if (location.includes('melbourne') || location.includes('victoria')) {
          tz = "Australia/Melbourne";
        } else if (location.includes('sydney') || location.includes('nsw')) {
          tz = "Australia/Sydney";
        } else if (location.includes('brisbane') || location.includes('queensland')) {
          tz = "Australia/Brisbane";
        } else if (location.includes('perth') || location.includes('western australia')) {
          tz = "Australia/Perth";
        } else if (location.includes('adelaide') || location.includes('south australia')) {
          tz = "Australia/Adelaide";
        } else if (location.includes('darwin') || location.includes('northern territory')) {
          tz = "Australia/Darwin";
        } else if (location.includes('hobart') || location.includes('tasmania')) {
          tz = "Australia/Hobart";
        } else if (location.includes('new york') || location.includes('nyc')) {
          tz = "America/New_York";
        } else if (location.includes('los angeles') || location.includes('california')) {
          tz = "America/Los_Angeles";
        } else if (location.includes('chicago') || location.includes('illinois')) {
          tz = "America/Chicago";
        } else if (location.includes('london') || location.includes('uk') || location.includes('england')) {
          tz = "Europe/London";
        } else if (location.includes('paris') || location.includes('france')) {
          tz = "Europe/Paris";
        } else if (location.includes('tokyo') || location.includes('japan')) {
          tz = "Asia/Tokyo";
        }
      }
      
      // Build a UTC date from the components first
      const provisional = new Date(Date.UTC(year, month, day, H, M));

      try {
        // Use Intl to obtain the offset *at that instant* for the given zone
        const fmt = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          timeZoneName: "shortOffset",
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", hourCycle: "h23"
        });
        const partsArr = fmt.formatToParts(provisional);
        const offPart = partsArr.find(p => p.type === "timeZoneName");
        if (!offPart) throw new Error(`Could not resolve timezone offset for ${tz}`);
        
        // offPart.value looks like "GMT+10" or "GMT-05:30"
        const mOffset = offPart.value.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
        if (!mOffset) throw new Error(`Unexpected offset string ${offPart.value}`);

        const sign = mOffset[1] === "-" ? -1 : 1;
        const hOff = Number(mOffset[2]);
        const minOff = Number(mOffset[3] ?? "0");
        const totalMinutes = sign * (hOff * 60 + minOff);

        const utcMillis = provisional.getTime() - totalMinutes * 60 * 1000;
        return new Date(utcMillis).toISOString();
      } catch (tzError) {
        console.warn(`Could not resolve timezone for ${parts.location}, falling back to UTC`);
        // Fall back to treating the time as UTC
        return provisional.toISOString();
      }
    } else {
      // Just birth_date without time - treat as-is (this is the old behavior)
      const d = new Date(actualDate);
      if (isNaN(d.getTime())) throw new Error("Invalid date timestamp");
      return d.toISOString();
    }
  }

  // Need date + time combo (original logic)
  if (!actualDate || !actualTime) throw new Error("Both date and time are required");
  const tz = parts.tz ?? "UTC"; // default but we'll warn later

  // Build a UTC date from the components first
  const [y, m, d] = actualDate.split("-").map(Number);
  const [H, M] = actualTime.split(":").map(Number);
  const provisional = new Date(Date.UTC(y, m - 1, d, H, M)); // treat as UTC initially

  // Use Intl to obtain the offset *at that instant* for the given zone
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "shortOffset",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  });
  const partsArr = fmt.formatToParts(provisional);
  const offPart = partsArr.find(p => p.type === "timeZoneName");
  if (!offPart) throw new Error(`Could not resolve timezone offset for ${tz}`);
  // offPart.value looks like "GMT+10" or "GMT-05:30"
  const mOffset = offPart.value.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!mOffset) throw new Error(`Unexpected offset string ${offPart.value}`);

  const sign = mOffset[1] === "-" ? -1 : 1;
  const hOff = Number(mOffset[2]);
  const minOff = Number(mOffset[3] ?? "0");
  const totalMinutes = sign * (hOff * 60 + minOff);

  const utcMillis = provisional.getTime() - totalMinutes * 60 * 1000;
  return new Date(utcMillis).toISOString();
}

/** Map user strings (placidus, whole‑sign …) → Swiss letter codes. */
const HOUSE_ALIASES: Record<string, string> = { placidus: "P", koch: "K", "whole-sign": "W", equal: "A" };

function normalise(p: any) {
  const out: { [k: string]: any } = { ...p };
  
  // Convert house aliases → Swiss letter
  if (out.house && !out.settings?.house_system) {
    const letter = HOUSE_ALIASES[out.house.toLowerCase()];
    if (letter) out.settings = { ...(out.settings ?? {}), house_system: letter };
  }

  // Convert field names for Swiss API compatibility
  // Swiss expects birth_date and birth_time, not date and time
  if (out.date && !out.birth_date) {
    out.birth_date = out.date;
    delete out.date;
  }
  
  if (out.time && !out.birth_time) {
    out.birth_time = out.time;
    delete out.time;
  }

  return out;
}

/*──────────────── geo helper (unchanged) ----------------------------------*/
async function ensureLatLon(obj: any): Promise<{ data: any; googleGeoUsed: boolean }> {
  if ((obj.latitude !== undefined && obj.longitude !== undefined) || !obj.location) {
    return { data: obj, googleGeoUsed: false };
  }
  const place = String(obj.location).trim();
  // 1.  check cache
  const { data } = await sb.from(GEO_TABLE).select("lat,lon,updated_at").eq("place", place).maybeSingle();
  if (data) {
    const age = (Date.now() - Date.parse(data.updated_at)) / 60000;
    if (age < GEO_TTL_MIN) return { data: { ...obj, latitude: data.lat, longitude: data.lon }, googleGeoUsed: false };
  }
  // 2. fall back to Google Geocode
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(place)}&key=${GEO_KEY}`;
  const g = await fetch(url).then(r => r.json());
  if (g.status !== "OK") throw new Error(`Geocode failed: ${g.status}`);
  const { lat, lng } = g.results[0].geometry.location;
  await sb.from(GEO_TABLE).upsert({ place, lat, lon: lng });
  return { data: { ...obj, latitude: lat, longitude: lng }, googleGeoUsed: true };
}

// Infer timezone from coordinates using Google Timezone API
async function inferTimezone(obj: any): Promise<string | null> {
  if (obj.tz) return obj.tz;         // already provided

  // prefer the resolved lat/lon we just put on the object
  if (obj.latitude !== undefined && obj.longitude !== undefined) {
    const tfUrl = `https://maps.googleapis.com/maps/api/timezone/json?location=${obj.latitude},${obj.longitude}&timestamp=0&key=${GEO_KEY}`;
    const tf = await fetch(tfUrl).then(r => r.json());
    if (tf.status === "OK" && tf.timeZoneId) return tf.timeZoneId;
  }

  return null; // give up
}

/*──────────────── handleReportGeneration helper ---------------------------*/
async function handleReportGeneration(params: {
  requestData: any;
  swissApiResponse: any;
  swissApiStatus: number;
  requestId?: string;
}): Promise<void> {
  const { requestData, swissApiResponse, swissApiStatus, requestId } = params;
  const logPrefix = requestId ? `[reportHandler][${requestId}]` : "[reportHandler]";
  
  console.log(`${logPrefix} ========== REPORT GENERATION DEBUG START ==========`);
  console.log(`${logPrefix} Swiss API Status: ${swissApiStatus}`);
  console.log(`${logPrefix} Request Data Keys: ${Object.keys(requestData || {}).join(', ')}`);
  console.log(`${logPrefix} Report field in request: ${JSON.stringify(requestData?.report)}`);
  
  // Only proceed if Swiss API call was successful and report is requested
  if (swissApiStatus !== 200) {
    console.log(`${logPrefix} Swiss API failed (${swissApiStatus}), skipping report generation`);
    return;
  }

  if (!requestData?.report) {
    console.log(`${logPrefix} No report requested, skipping report generation`);
    return;
  }

  try {
    // Parse Swiss API response
    let swissData;
    try {
      swissData = typeof swissApiResponse === 'string' ? JSON.parse(swissApiResponse) : swissApiResponse;
    } catch (parseError) {
      console.error(`${logPrefix} Failed to parse Swiss API response:`, parseError);
      return;
    }

    // Resolve API key for guest reports
    let resolvedApiKey = requestData.api_key;
    
    if (!resolvedApiKey && requestData.user_id) {
      console.log(`${logPrefix} Guest report detected, checking for valid Stripe session...`);
      
      try {
        const { data: guestReport, error } = await sb
          .from("guest_reports")
          .select("stripe_session_id")
          .eq("id", requestData.user_id)
          .single();
        
        if (error) {
          console.error(`${logPrefix} Failed to query guest_reports:`, error);
          resolvedApiKey = null;
        } else if (guestReport?.stripe_session_id) {
          console.log(`${logPrefix} Valid Stripe session found for guest report`);
          resolvedApiKey = "GUEST-STRIPE";
        } else {
          console.log(`${logPrefix} No valid Stripe session found for guest report`);
          resolvedApiKey = null;
        }
      } catch (error) {
        console.error(`${logPrefix} Error resolving guest API key:`, error);
        resolvedApiKey = null;
      }
    }

    // Determine if this is a guest user
    const isGuest = !!(requestData.stripe_session_id || resolvedApiKey === "GUEST-STRIPE");

    // Prepare report payload
    const reportPayload = {
      endpoint: requestData.request || "unknown",
      report_type: requestData.report,
      user_id: requestData.user_id,
      apiKey: resolvedApiKey,
      is_guest: isGuest,
      chartData: {
        ...swissData,
        person_a_name: requestData.person_a?.name,
        person_b_name: requestData.person_b?.name
      },
      ...requestData
    };

    console.log(`${logPrefix} Calling report orchestrator for "${reportPayload.report_type}" report...`);
    
    // Call the report orchestrator (don't save the result - let orchestrator handle it)
    const { processReportRequest } = await import("../_shared/reportOrchestrator.ts");
    await processReportRequest(reportPayload);
    
    console.log(`${logPrefix} Report orchestrator call completed`);
    console.log(`${logPrefix} ========== REPORT GENERATION DEBUG END ==========`);
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix} Unexpected error in report generation:`, errorMsg);
    console.log(`${logPrefix} ========== REPORT GENERATION DEBUG END ==========`);
  }
}

/*──────────────── logging --------------------------------------------------*/
async function logTranslator(run: {
  request_type: string,
  request_payload: any,
  swiss_data: any, // FIXED: Changed from swiss_response to swiss_data
  swiss_status: number,
  processing_ms: number,
  error?: string,
  google_geo: boolean,
  translator_payload: any,
  user_id?: string,
  skip: boolean,
  is_guest?: boolean
}) {
  if (run.skip) return;
  const insertData = {
    request_type: run.request_type,
    request_payload: run.request_payload,
    translator_payload: run.translator_payload,
    response_status: run.swiss_status,
    swiss_data: run.swiss_data, // FIXED: Using swiss_data for compatibility
    processing_time_ms: run.processing_ms,
    error_message: run.error,
    google_geo: run.google_geo,
    user_id: run.user_id ?? null,
    is_guest: run.is_guest ?? false,
  };
  const { error } = await sb.from("translator_logs").insert(insertData);
  if (error) console.error("[translator] log insert failed:", error.message);
}

/*──────────────── CANON ----------------------------------------------------*/
const CANON: Record<string, string> = {
  natal: "natal", transits: "transits", progressions: "progressions", return: "return",
  synastry: "synastry", compatibility: "synastry", positions: "positions", moonphases: "moonphases",
  body: "body_matrix", body_matrix: "body_matrix", sync: "sync", essence: "essence", flow: "flow",
  mindset: "mindset", monthly: "monthly", focus: "focus"
};

/*──────────────── Edge Function handler -----------------------------------*/
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const t0 = Date.now();
  const reqId = crypto.randomUUID().slice(0, 8);
  let skipLogging = false;
  let requestType = "unknown";
  let googleGeo = false;

  try {
    const raw = await req.json();
    console.log(`[translator-edge-${reqId}] Request received:`, JSON.stringify(raw, null, 2));
    
    skipLogging = raw.skip_logging === true;
    const parsed = baseSchema.parse(raw);
    requestType = parsed.request.trim().toLowerCase();
    const canon = CANON[requestType];
    if (!canon) throw new Error(`Unknown request '${parsed.request}'`);

    console.log(`[translator-edge-${reqId}] Canon endpoint: ${canon}`);

    /*────────────────── Handle sync requests with person_a and person_b --*/
    let payload;
    
    if (canon === "sync" && parsed.person_a && parsed.person_b) {
      console.log(`[translator-edge-${reqId}] Processing sync request with person_a and person_b`);
      
      // Process person_a
      const { data: personAWithLatLon, googleGeoUsed: geoUsedA } = await ensureLatLon(parsed.person_a);
      const normalizedPersonA = normalise(personAWithLatLon);
      
      // Process person_b  
      const { data: personBWithLatLon, googleGeoUsed: geoUsedB } = await ensureLatLon(parsed.person_b);
      const normalizedPersonB = normalise(personBWithLatLon);
      
      googleGeo = geoUsedA || geoUsedB;
      
      // Create sync payload with normalized person data
      payload = {
        person_a: normalizedPersonA,
        person_b: normalizedPersonB,
        ...parsed // Keep other top-level fields like report, user_id, etc.
      };
      
      // Remove the person objects from top level to avoid duplication
      delete payload.person_a;
      delete payload.person_b;
      
      // Re-add the normalized persons
      payload.person_a = normalizedPersonA;
      payload.person_b = normalizedPersonB;
      
      console.log(`[translator-edge-${reqId}] Sync payload prepared with normalized persons`);
      
    } else {
      /*────────────────── Regular processing for non-sync requests ----------*/
      const { data: withLatLon, googleGeoUsed } = await ensureLatLon(parsed);
      googleGeo = googleGeoUsed;

      // Attach accurate UTC stamp if this is a chart‑type request (not positions/moonphases)
      if (["natal", "essence", "sync", "flow", "mindset", "monthly", "focus", "progressions", "return", "transits"].includes(canon)) {
        try {
          const tzGuess = await inferTimezone(withLatLon);
          const utcISO = toUtcISO({ ...withLatLon, tz: tzGuess ?? withLatLon.tz });
          withLatLon.utc = utcISO; // Swiss wrapper recognises 'utc'
          
          console.log(`[translator-edge-${reqId}] UTC timestamp generated: ${utcISO}`);

          // Swiss Ephemeris requires both birth_date and birth_time
          if (!parsed.birth_date && !parsed.date) {
            throw new Error("Missing birth_date or date for Swiss Ephemeris");
          }
          if (!parsed.birth_time && !parsed.time) {
            throw new Error("Missing birth_time or time for Swiss Ephemeris");
          }

          // Re-attach cleaned fields in correct format
          withLatLon.birth_date = parsed.birth_date || parsed.date;
          withLatLon.birth_time = parsed.birth_time || parsed.time;
          withLatLon.tz = parsed.tz || tzGuess || 'UTC'; // fallback safe default
          
        } catch (timeError) {
          console.warn(`[translator-edge-${reqId}] Could not generate UTC timestamp:`, timeError);
          // Don't fail the request, let Swiss handle it as before
        }
      }

      payload = normalise(withLatLon);
    }
    console.log(`[translator-edge-${reqId}] Final payload:`, JSON.stringify(payload, null, 2));

    /*────────────────── dispatch to Swiss API ----------------------------*/
    const url = `${SWISS_API}/${canon}`;
    const swiss = await fetch(url, {
      method: canon === "moonphases" || canon === "positions" ? "GET" : "POST",
      headers: { "Content-Type": "application/json" },
      body: canon === "moonphases" || canon === "positions" ? undefined : JSON.stringify(payload)
    });
    
    const txt = await swiss.text();
    const tryJson = () => { try { return JSON.parse(txt); } catch { return { raw: txt }; } };
    const swissData = tryJson();

    console.log(`[translator-edge-${reqId}] Swiss response status: ${swiss.status}`);

    /*────────────────── AI report generation (if requested) --------------*/
    if (raw.report && swiss.ok) {
      console.log(`[translator-edge-${reqId}] Report requested: "${raw.report}", triggering AI generation`);
      
      // Call handleReportGeneration but don't save its result
      // The orchestrator will handle everything
      try {
        await handleReportGeneration({
          requestData: raw,
          swissApiResponse: swissData,
          swissApiStatus: swiss.status,
          requestId: reqId
        });
      } catch (reportError) {
        console.error(`[translator-edge-${reqId}] Report generation error:`, reportError);
        // Don't fail the main request - Swiss data is still valid
      }
    }

    /*────────────────── logging ------------------------------------------*/
    await logTranslator({
      request_type: canon, request_payload: raw, swiss_data: swissData,
      swiss_status: swiss.status, processing_ms: Date.now() - t0,
      error: swiss.ok ? undefined : `Swiss API ${swiss.status}`,
      google_geo: googleGeo, translator_payload: payload,
      user_id: raw.user_id, skip: skipLogging, is_guest: raw.is_guest
    });

    /*────────────────── response to caller -------------------------------*/
    return new Response(txt, { status: swiss.status, headers: corsHeaders });

  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[translator-edge-${reqId}] Error:`, msg);
    
    await logTranslator({
      request_type: requestType, request_payload: "n/a", swiss_data: { error: msg }, swiss_status: 500,
      processing_ms: Date.now() - t0, error: msg, google_geo: googleGeo, translator_payload: null,
      user_id: undefined, skip: skipLogging
    });
    
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});
