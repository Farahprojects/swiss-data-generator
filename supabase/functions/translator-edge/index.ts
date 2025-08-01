// simplified translator-edge - fast, linear, lightweight
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

const sb = createClient(SB_URL, SB_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

/*──────────────── schema & utils ------------------------------------------*/
const baseSchema = z.object({
  request: z.string().nonempty(),
  date:        z.string().optional(),
  birth_date:  z.string().optional(),
  time:        z.string().optional(),
  birth_time:  z.string().optional(),
  tz: z.string().optional(),
  local: z.string().optional(),
  utc:   z.string().optional(),
  latitude:  z.number().optional(),
  longitude: z.number().optional(),
  location:  z.string().optional(),
  reportType:    z.string().optional(),
  is_guest:      z.boolean().optional(),
  user_id:       z.string().optional(),
  name:          z.string().optional(),
  person_a:      z.any().optional(),
  person_b:      z.any().optional(),
  year:          z.number().optional(),
  return_date:   z.string().optional(),
}).refine((v) => {
  if (v.utc || v.local) return true;
  if (v.person_a) return true;
  const hasDate = v.date || v.birth_date;
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
  
  if (!actualDate || !actualTime) {
    throw new Error("Need both date and time for UTC conversion");
  }

  const tz = parts.tz || "UTC";
  const dateTimeStr = `${actualDate}T${actualTime}`;
  const localDate = new Date(`${dateTimeStr} ${tz}`);
  
  if (isNaN(localDate.getTime())) {
    throw new Error(`Invalid date/time: ${dateTimeStr} in timezone ${tz}`);
  }
  
  return localDate.toISOString();
}

function normalise(obj: any) {
  return {
    name: obj.name || "",
    birth_date: obj.birth_date || obj.date || "",
    birth_time: obj.birth_time || obj.time || "",
    latitude: obj.latitude || 0,
    longitude: obj.longitude || 0,
    location: obj.location || "",
    house_system: obj.house_system || "P",
    tz: obj.tz || "UTC"
  };
}

async function ensureLatLon(obj: any) {
  if (obj.latitude && obj.longitude) {
    return { data: obj, googleGeoUsed: false };
  }
  
  if (!obj.location) {
    throw new Error("Need either lat/lon or location for geocoding");
  }
  
  // Check cache first
  const { data: cached } = await sb
    .from(GEO_TABLE)
    .select("latitude, longitude")
    .eq("location", obj.location.toLowerCase())
    .single();
  
  if (cached) {
    return { 
      data: { ...obj, latitude: cached.latitude, longitude: cached.longitude }, 
      googleGeoUsed: false 
    };
  }
  
  // Geocode via Google API
  const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(obj.location)}&key=${GEO_KEY}`;
  const geoRes = await fetch(geoUrl);
  const geoData = await geoRes.json();
  
  if (!geoData.results?.[0]?.geometry?.location) {
    throw new Error(`Geocoding failed for: ${obj.location}`);
  }
  
  const { lat, lng } = geoData.results[0].geometry.location;
  
  // Cache the result
  await sb.from(GEO_TABLE).upsert({
    location: obj.location.toLowerCase(),
    latitude: lat,
    longitude: lng,
    cached_at: new Date().toISOString()
  });
  
  return { 
    data: { ...obj, latitude: lat, longitude: lng }, 
    googleGeoUsed: true 
  };
}

async function inferTimezone(obj: any) {
  if (obj.tz) return obj.tz;
  if (!obj.latitude || !obj.longitude) return "UTC";
  
  const tzUrl = `https://maps.googleapis.com/maps/api/timezone/json?location=${obj.latitude},${obj.longitude}&timestamp=${Math.floor(Date.now() / 1000)}&key=${GEO_KEY}`;
  const tzRes = await fetch(tzUrl);
  const tzData = await tzRes.json();
  
  return tzData.timeZoneId || "UTC";
}

serve(async (req) => {
  const t0 = Date.now();
  const reqId = crypto.randomUUID().substring(0, 8);
  
  console.log(`[translator-edge-${reqId}] Starting request`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const body = await req.json();
    console.log(`[translator-edge-${reqId}] Request body:`, JSON.stringify(body));
    
    // Validate input
    const parsed = baseSchema.parse(body);
    const canon = parsed.request.toLowerCase();
    const isGuest = parsed.is_guest || false;
    const userId = parsed.user_id;
    
    console.log(`[translator-edge-${reqId}] Canonical request: ${canon}, is_guest: ${isGuest}, user_id: ${userId}`);
    
    let payload: any;
    let googleGeo = false;
    
    // Handle two-person requests (synastry, etc.)
    if (parsed.person_a && parsed.person_b) {
      console.log(`[translator-edge-${reqId}] Processing two-person request`);
      
      const {data:pa, googleGeoUsed:g1} = await ensureLatLon(parsed.person_a);
      const tzA = await inferTimezone(pa);
      pa.tz = tzA || pa.tz || "UTC";
      const utcA = toUtcISO({...pa, tz: pa.tz, location: pa.location || ""});
      const normA = {...normalise(pa), utc: utcA, tz: pa.tz};
      
      const {data:pb, googleGeoUsed:g2} = await ensureLatLon(parsed.person_b);
      const tzB = await inferTimezone(pb);
      pb.tz = tzB || pb.tz || "UTC";
      const utcB = toUtcISO({...pb, tz: pb.tz, location: pb.location || ""});
      const normB = {...normalise(pb), utc: utcB, tz: pb.tz};
      
      googleGeo = g1 || g2;
      payload = { person_a: normA, person_b: normB, ...parsed };
    } else {
      // Single person request
      const {data: withLatLon, googleGeoUsed} = await ensureLatLon(parsed);
      googleGeo = googleGeoUsed;
      
      if (["natal", "essence", "sync", "flow", "mindset", "monthly", "focus", "progressions", "return", "transits"].includes(canon)) {
        try {
          const tzGuess = await inferTimezone(withLatLon);
          const source = parsed.person_a ?? parsed;
          const date = source.birth_date ?? source.date;
          const time = source.birth_time ?? source.time;
          
          if (!date) throw new Error("Missing birth_date");
          if (!time) throw new Error("Missing birth_time");
          
          withLatLon.birth_date = date;
          withLatLon.birth_time = time;
          withLatLon.tz = parsed.tz || tzGuess || source.tz || "UTC";
          
          const utcISO = toUtcISO({
            birth_date: date,
            birth_time: time,
            tz: withLatLon.tz,
            location: source.location ?? parsed.location ?? ""
          });
          
          withLatLon.utc = parsed.utc || utcISO;
        } catch(e) { 
          console.warn(`[translator-edge-${reqId}] UTC gen fail`, e); 
        }
      }
      
      payload = {
        ...(parsed.person_a ?? withLatLon),
        utc: withLatLon.utc,
        tz: withLatLon.tz,
        reportType: parsed.reportType,
        request: parsed.request,
        user_id: parsed.user_id,
        is_guest: parsed.is_guest,
        house_system: parsed.person_a?.house_system ?? withLatLon.house_system ?? "P",
      };
    }
    
    console.log(`[translator-edge-${reqId}] Final payload:`, JSON.stringify(payload));
    
    // Call Swiss API
    const url = `${SWISS_API}/${canon}`;
    console.log(`[translator-edge-${reqId}] Calling Swiss API: ${url}`);
    
    const swiss = await fetch(url, {
      method: ["moonphases", "positions"].includes(canon) ? "GET" : "POST",
      headers: {"Content-Type": "application/json"},
      body: ["moonphases", "positions"].includes(canon) ? undefined : JSON.stringify(payload)
    });
    
    const txt = await swiss.text();
    console.log(`[translator-edge-${reqId}] Swiss API response: ${swiss.status}, length: ${txt.length}`);
    
    // Fire report-orchestrator if we have reportType and Swiss data
    if (parsed.reportType && swiss.ok) {
      console.log(`[translator-edge-${reqId}] Firing report-orchestrator`);
      
      const orchestratorUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/report-orchestrator`;
      const orchestratorPayload = {
        endpoint: parsed.request,
        report_type: parsed.reportType,
        user_id: parsed.user_id,
        apiKey: parsed.api_key,
        is_guest: !!parsed.is_guest,
        chartData: { 
          ...JSON.parse(txt), 
          person_a_name: parsed.person_a?.name, 
          person_b_name: parsed.person_b?.name 
        },
        ...parsed
      };
      
      // Fire and forget - no await, no error handling
      fetch(orchestratorUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
        },
        body: JSON.stringify(orchestratorPayload),
      }).catch(e => console.error(`[translator-edge-${reqId}] Report orchestrator failed:`, e));
      
      console.log(`[translator-edge-${reqId}] Report orchestrator fired`);
    }
    
    // Return Swiss response immediately
    console.log(`[translator-edge-${reqId}] Returning Swiss response (${Date.now() - t0}ms)`);
    return new Response(txt, { status: swiss.status, headers: corsHeaders });
    
  } catch(err) {
    const msg = (err as Error).message;
    console.error(`[translator-edge-${reqId}] Error:`, msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: corsHeaders });
  }
});
