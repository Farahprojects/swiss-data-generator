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
const VERSION = "translator-edge v3.0 (2025‑07‑22)";

const sb = createClient(SB_URL, SB_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

/*──────────────────── schema & utils --------------------------------------*/
// Accepted request keys for a single‑person chart request
const baseSchema = z.object({
  request: z.string().nonempty(),

  // Any of the following triads is acceptable (Zod `refine` below enforces):
  date: z.string().optional(), // YYYY‑MM‑DD
  time: z.string().optional(), // HH:MM (24‑h)
  tz: z.string().optional(), // IANA tz name e.g. "Australia/Melbourne"

  local: z.string().optional(), // ISO‑8601 with offset e.g. 1981‑07‑20T06:36:00+10:00

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
  birth_date: z.string().optional(),
  person_a: z.any().optional(),
  person_b: z.any().optional(),
  year: z.number().optional(),
  return_date: z.string().optional(),
}).refine((v) => {
  // Accept if `local` is present OR (date+time) present OR birth_date present
  if (v.local) return true;
  if (v.date && v.time) return true;
  if (v.birth_date) return true;
  // For some requests like moonphases, positions, we don't need birth time
  if (['moonphases', 'positions'].includes(v.request?.toLowerCase() || '')) return true;
  return false;
}, { message: "Provide either 'local', 'date' + 'time', or 'birth_date'." });

/** Parse a resp ISO‑8601 or (date, time, tz?) combo → ISO‑UTC string. */
export function toUtcISO(parts: { date?: string; time?: string; tz?: string; local?: string; birth_date?: string }): string {
  if (parts.local) {
    // Already ISO with offset – just convert to UTC
    const d = new Date(parts.local);
    if (isNaN(d.getTime())) throw new Error("Invalid 'local' timestamp");
    return d.toISOString();
  }

  // Handle birth_date format (used by existing payloads)
  if (parts.birth_date) {
    const d = new Date(parts.birth_date);
    if (isNaN(d.getTime())) throw new Error("Invalid 'birth_date' timestamp");
    return d.toISOString();
  }

  // Need date + time combo
  const { date, time } = parts;
  if (!date || !time) throw new Error("Both 'date' and 'time' are required");
  const tz = parts.tz ?? "UTC"; // default but we'll warn later

  // Build a UTC date from the components first
  const [y, m, d] = date.split("-").map(Number);
  const [H, M] = time.split(":").map(Number);
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
  // convert house aliases → Swiss letter
  if (out.house && !out.settings?.house_system) {
    const letter = HOUSE_ALIASES[out.house.toLowerCase()];
    if (letter) out.settings = { ...(out.settings ?? {}), house_system: letter };
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

/*──────────────── logging --------------------------------------------------*/
async function logTranslator(run: {
  request_type: string,
  request_payload: any,
  swiss_response: any,
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
    swiss_data: run.swiss_response,
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

    /*────────────────── augment lat/lon & timestamp ----------------------*/
    const { data: withLatLon, googleGeoUsed } = await ensureLatLon(parsed);
    googleGeo = googleGeoUsed;

    // Attach accurate UTC stamp if this is a chart‑type request (not positions/moonphases)
    if (["natal", "essence", "sync", "flow", "mindset", "monthly", "focus", "progressions", "return", "transits"].includes(canon)) {
      try {
        const utcISO = toUtcISO(withLatLon);
        withLatLon.utc = utcISO; // Swiss wrapper recognises 'utc'
        console.log(`[translator-edge-${reqId}] UTC timestamp generated: ${utcISO}`);
      } catch (timeError) {
        console.warn(`[translator-edge-${reqId}] Could not generate UTC timestamp:`, timeError);
        // Don't fail the request, let Swiss handle it as before
      }
    }

    const payload = normalise(withLatLon);
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

    console.log(`[translator-edge-${reqId}] Swiss response status: ${swiss.status}`);

    /*────────────────── logging ------------------------------------------*/
    await logTranslator({
      request_type: canon, request_payload: raw, swiss_response: tryJson(),
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
      request_type: requestType, request_payload: "n/a", swiss_response: { error: msg }, swiss_status: 500,
      processing_ms: Date.now() - t0, error: msg, google_geo: googleGeo, translator_payload: null,
      user_id: undefined, skip: skipLogging
    });
    
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});
