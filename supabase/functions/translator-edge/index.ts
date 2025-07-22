import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*──────────────── ENV ------------------------------------------------------*/
const SWISS_API = Deno.env.get("SWISS_EPHEMERIS_URL")!;
const SB_URL    = Deno.env.get("SUPABASE_URL")!;
const SB_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEO_KEY   = Deno.env.get("GOOGLE_API_KEY")!;
const GEO_TTL_MIN = +(Deno.env.get("GEOCODE_TTL_MIN") ?? "1440");
const GEO_TABLE   = Deno.env.get("GEOCODE_CACHE_TABLE") ?? "geo_cache";
const VERSION = "translator-edge v3.5 (2025‑07‑22)";

const sb = createClient(SB_URL, SB_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

/*──────────────── schema & utils ------------------------------------------*/
// Updated schema now allows top‑level `utc` and keeps legacy field names for compatibility
const baseSchema = z.object({
  request: z.string().nonempty(),

  // Date fields
  date:        z.string().optional(),
  birth_date:  z.string().optional(),

  // Time fields
  time:        z.string().optional(),
  birth_time:  z.string().optional(),

  // Timezone name (IANA)
  tz: z.string().optional(),

  // Explicit local timestamp and explicit UTC timestamp
  local: z.string().optional(),
  utc:   z.string().optional(),

  // Location
  latitude:  z.number().optional(),
  longitude: z.number().optional(),
  location:  z.string().optional(),

  // Misc routing / flags
  report:        z.string().optional(),
  is_guest:      z.boolean().optional(),
  user_id:       z.string().optional(),
  skip_logging:  z.boolean().optional(),

  // Flexible payload support
  name:          z.string().optional(),
  person_a:      z.any().optional(),
  person_b:      z.any().optional(),
  year:          z.number().optional(),
  return_date:   z.string().optional(),
}).refine((v) => {
  if (v.utc || v.local) return true;                       // already timestamped
  if (v.person_a) return true;                             // defer validation for sync
  const hasDate = v.date || v.birth_date;                  // need date+time otherwise
  const hasTime = v.time || v.birth_time;
  if (hasDate && hasTime) return true;
  if (["moonphases", "positions"].includes(v.request?.toLowerCase() || "")) return true;
  return false;
}, { message: "Provide 'utc' or 'local', or a birth_date + birth_time pair." });

/** Parse various timestamp combos into an ISO‑UTC string. */
export function toUtcISO(parts: { date?: string; time?: string; tz?: string; local?: string; birth_date?: string; birth_time?: string; location?: string }): string {
  if (parts.local) {
    const d = new Date(parts.local);
    if (isNaN(d.getTime())) throw new Error("Invalid 'local' timestamp");
    return d.toISOString();
  }

  const actualDate = parts.birth_date || parts.date;
  const actualTime = parts.birth_time || parts.time;

  // When full birth data supplied (date + time + tz) use that
  if (actualDate && actualTime) {
    const tz = parts.tz || "UTC"; // caller/inference should supply tz; fallback UTC
    const [y, m, d] = actualDate.split("-").map(Number);
    const [H, M]    = actualTime.split(":" as const).map(Number);
    const provisional = new Date(Date.UTC(y, m - 1, d, H, M));
    try {
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "shortOffset",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      });
      const off = fmt.formatToParts(provisional).find(p => p.type === "timeZoneName")?.value ?? "GMT+0";
      const mOff = off.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
      if (!mOff) throw new Error("offset parse");
      const sign = mOff[1] === "-" ? -1 : 1;
      const hOff = +mOff[2];
      const minOff = +(mOff[3] || 0);
      const total = sign * (hOff * 60 + minOff);
      return new Date(provisional.getTime() - total * 60000).toISOString();
    } catch {
      return provisional.toISOString(); // last‑ditch: treat as UTC
    }
  }

  // If only date (no time) treat 00:00 as UTC boundary (positions/moonphases etc.)
  if (actualDate) {
    const d = new Date(actualDate);
    if (isNaN(d.getTime())) throw new Error("Invalid date");
    return d.toISOString();
  }

  throw new Error("Both date and time are required");
}

/** Map user house aliases → Swiss codes. */
const HOUSE_ALIASES: Record<string,string> = {
  placidus:"P", koch:"K", "whole-sign":"W", equal:"A", vedic:"V", v:"V", ved:"V"
};
function normalise(obj: any) {
  const out = { ...obj };
  if (out.house && !out.settings?.house_system) {
    const letter = HOUSE_ALIASES[out.house.toLowerCase()];
    if (letter) out.settings = { ...(out.settings||{}), house_system: letter };
  }
  if (out.date && !out.birth_date) { out.birth_date = out.date; delete out.date; }
  if (out.time && !out.birth_time){ out.birth_time = out.time; delete out.time; }
  return out;
}

/*──────────────── geo helpers --------------------------------------------*/
async function ensureLatLon(obj:any){
  if ((obj.latitude!==undefined&&obj.longitude!==undefined)||!obj.location){
    return { data: obj, googleGeoUsed:false };
  }
  const place = String(obj.location).trim();
  const { data } = await sb.from(GEO_TABLE).select("lat,lon,updated_at").eq("place", place).maybeSingle();
  if (data){
    const min = (Date.now()-Date.parse(data.updated_at))/60000;
    if (min < GEO_TTL_MIN) return { data:{...obj,latitude:data.lat,longitude:data.lon}, googleGeoUsed:false };
  }
  const g = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(place)}&key=${GEO_KEY}`).then(r=>r.json());
  if (g.status!=="OK") throw new Error(`Geocode failed: ${g.status}`);
  const { lat,lng } = g.results[0].geometry.location;
  await sb.from(GEO_TABLE).upsert({ place, lat, lon: lng });
  return { data:{...obj,latitude:lat,longitude:lng}, googleGeoUsed:true };
}
async function inferTimezone(obj:any){
  if (obj.tz) return obj.tz;
  if (obj.latitude!==undefined&&obj.longitude!==undefined){
    const tf = await fetch(`https://maps.googleapis.com/maps/api/timezone/json?location=${obj.latitude},${obj.longitude}&timestamp=0&key=${GEO_KEY}`).then(r=>r.json());
    if (tf.status==="OK"&&tf.timeZoneId) return tf.timeZoneId;
  }
  return null;
}

/*──────────────── report helper -------------------------------------------*/
async function handleReportGeneration(params:{requestData:any;swissApiResponse:any;swissApiStatus:number;requestId?:string}){
  const { requestData,swissApiResponse,swissApiStatus,requestId } = params;
  const tag = requestId ? `[reportHandler][${requestId}]` : "[reportHandler]";
  if (swissApiStatus!==200 || !requestData?.report) return;
  let swissData: any;
  try{ swissData = typeof swissApiResponse==="string"?JSON.parse(swissApiResponse):swissApiResponse; }catch{return; }
  try{
    const { processReportRequest } = await import("../_shared/reportOrchestrator.ts");
    await processReportRequest({
      endpoint: requestData.request,
      report_type: requestData.report,
      user_id: requestData.user_id,
      apiKey: requestData.api_key,
      is_guest: !!requestData.is_guest,
      chartData: { ...swissData, person_a_name: requestData.person_a?.name, person_b_name: requestData.person_b?.name },
      ...requestData
    });
  }catch{}
}

/*──────────────── logging --------------------------------------------------*/
async function logTranslator(run:{request_type:string;request_payload:any;swiss_data:any;swiss_status:number;processing_ms:number;error?:string;google_geo:boolean;translator_payload:any;user_id?:string;skip:boolean;is_guest?:boolean}){
  if(run.skip) return;
  await sb.from("translator_logs").insert({
    request_type: run.request_type,
    request_payload: run.request_payload,
    translator_payload: run.translator_payload,
    response_status: run.swiss_status,
    swiss_data: run.swiss_data,
    processing_time_ms: run.processing_ms,
    error_message: run.error,
    google_geo: run.google_geo,
    user_id: run.user_id ?? null,
    is_guest: run.is_guest ?? false,
  });
}

/*──────────────── CANON ----------------------------------------------------*/
const CANON:Record<string,string>={
  natal:"natal", transits:"transits", progressions:"progressions", return:"return",
  synastry:"synastry", compatibility:"synastry", positions:"positions", moonphases:"moonphases",
  body:"body_matrix", body_matrix:"body_matrix", sync:"sync", essence:"essence", flow:"flow",
  mindset:"mindset", monthly:"monthly", focus:"focus"
};

/*──────────────── Edge Function handler -----------------------------------*/
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = Date.now();
  const reqId = crypto.randomUUID().slice(0, 8);
  let skipLogging = false;
  let requestType = "unknown";
  let googleGeo = false;

  try {
    const raw = await req.json();
    skipLogging = raw.skip_logging === true;
    const parsed = baseSchema.parse(raw);
    requestType = parsed.request.trim().toLowerCase();
    const canon = CANON[requestType];
    if (!canon) throw new Error(`Unknown request '${parsed.request}'`);

    /*────────────────── augment lat/lon & timestamp ----------------------*/
    const { data: withLatLon, googleGeoUsed } = await ensureLatLon(parsed);
    googleGeo = googleGeoUsed;

    // Attach accurate UTC stamp if this is a chart‑type request (not positions/moonphases)
    if (["natal", "essence", "sync", "flow", "mindset", "monthly", "focus", "progressions", "return", "transits"].includes(canon)) {
      const utcISO = toUtcISO(withLatLon);
      withLatLon.utc = utcISO; // Swiss wrapper recognises 'utc'
    }

    const payload = normalise(withLatLon);

    /*────────────────── dispatch to Swiss API ----------------------------*/
    const url = `${SWISS_API}/${canon}`;
    const swiss = await fetch(url, {
      method: canon === "moonphases" || canon === "positions" ? "GET" : "POST",
      headers: { "Content-Type": "application/json" },
      body: canon === "moonphases" || canon === "positions" ? undefined : JSON.stringify(payload)
    });
    const txt = await swiss.text();
    const tryJson = () => { try { return JSON.parse(txt); } catch { return { raw: txt }; } };

    /*────────────────── logging ------------------------------------------*/
    await logTranslator({
      request_type: canon, request_payload: raw, swiss_data: tryJson(),
      swiss_status: swiss.status, processing_ms: Date.now() - t0,
      error: swiss.ok ? undefined : `Swiss API ${swiss.status}`,
      google_geo: googleGeo, translator_payload: payload,
      user_id: raw.user_id, skip: skipLogging, is_guest: raw.is_guest
    });

    /*────────────────── response to caller -------------------------------*/
    return new Response(txt, { status: swiss.status, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    const msg = (err as Error).message;
    await logTranslator({
      request_type: requestType, request_payload: "n/a", swiss_data: { error: msg }, swiss_status: 500,
      processing_ms: Date.now() - t0, error: msg, google_geo: googleGeo, translator_payload: null,
      user_id: undefined, skip: skipLogging, is_guest: false
    });
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
