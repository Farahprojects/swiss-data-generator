// ultra-fast translator-edge - normalize → Swiss API → orchestrator → return
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SWISS_API = Deno.env.get("SWISS_EPHEMERIS_URL")!;
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

// Simplified schema - only what we actually need
const schema = z.object({
  request: z.string().nonempty(),
  birth_date: z.string().optional(),
  birth_time: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  reportType: z.string().optional(),
  user_id: z.string().optional(),
  person_a: z.any().optional(),
  person_b: z.any().optional(),
}).refine((v) => {
  if (v.person_a) return true;
  const hasDate = v.birth_date;
  const hasTime = v.birth_time;
  if (hasDate && hasTime) return true;
  if (["moonphases", "positions"].includes(v.request?.toLowerCase() || "")) return true;
  return false;
}, { message: "Provide birth_date + birth_time pair or person_a." });

function toUtcISO(date: string, time: string, tz: string = "UTC"): string {
  const dateTimeStr = `${date}T${time}`;
  const localDate = new Date(`${dateTimeStr} ${tz}`);
  
  if (isNaN(localDate.getTime())) {
    throw new Error(`Invalid date/time: ${dateTimeStr} in timezone ${tz}`);
  }
  
  return localDate.toISOString();
}

async function geocode(location: string): Promise<{lat: number, lng: number}> {
  const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${Deno.env.get("GOOGLE_API_KEY")}`;
  const geoRes = await fetch(geoUrl);
  const geoData = await geoRes.json();
  
  if (!geoData.results?.[0]?.geometry?.location) {
    throw new Error(`Geocoding failed for: ${location}`);
  }
  
  return geoData.results[0].geometry.location;
}

async function getTimezone(lat: number, lng: number): Promise<string> {
  const tzUrl = `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${Math.floor(Date.now() / 1000)}&key=${Deno.env.get("GOOGLE_API_KEY")}`;
  const tzRes = await fetch(tzUrl);
  const tzData = await tzRes.json();
  
  return tzData.timeZoneId || "UTC";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const body = await req.json();
    const parsed = schema.parse(body);
    const canon = parsed.request.toLowerCase();
    
    let payload: any;
    
    // Handle two-person requests (synastry, etc.)
    if (parsed.person_a && parsed.person_b) {
      // Process person_a
      let pa = parsed.person_a;
      if (pa.location && (!pa.latitude || !pa.longitude)) {
        const coords = await geocode(pa.location);
        pa = { ...pa, latitude: coords.lat, longitude: coords.lng };
      }
      const tzA = await getTimezone(pa.latitude || 0, pa.longitude || 0);
      const utcA = toUtcISO(pa.birth_date, pa.birth_time, tzA);
      const normA = { ...pa, utc: utcA, tz: tzA };
      
      // Process person_b
      let pb = parsed.person_b;
      if (pb.location && (!pb.latitude || !pb.longitude)) {
        const coords = await geocode(pb.location);
        pb = { ...pb, latitude: coords.lat, longitude: coords.lng };
      }
      const tzB = await getTimezone(pb.latitude || 0, pb.longitude || 0);
      const utcB = toUtcISO(pb.birth_date, pb.birth_time, tzB);
      const normB = { ...pb, utc: utcB, tz: tzB };
      
      payload = { person_a: normA, person_b: normB };
    } else {
      // Single person request
      let data = parsed;
      if (data.location && (!data.latitude || !data.longitude)) {
        const coords = await geocode(data.location);
        data = { ...data, latitude: coords.lat, longitude: coords.lng };
      }
      
      if (["natal", "essence", "sync", "flow", "mindset", "monthly", "focus", "progressions", "return", "transits"].includes(canon)) {
        const tz = await getTimezone(data.latitude || 0, data.longitude || 0);
        const utc = toUtcISO(data.birth_date!, data.birth_time!, tz);
        data = { ...data, utc, tz };
      }
      
      payload = data;
    }
    
    // Call Swiss API
    const url = `${SWISS_API}/${canon}`;
    const swiss = await fetch(url, {
      method: ["moonphases", "positions"].includes(canon) ? "GET" : "POST",
      headers: {"Content-Type": "application/json"},
      body: ["moonphases", "positions"].includes(canon) ? undefined : JSON.stringify(payload)
    });
    
    const txt = await swiss.text();
    
    // Fire report-orchestrator if we have reportType
    if (parsed.reportType && swiss.ok) {
      const orchestratorUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/report-orchestrator`;
      const orchestratorPayload = {
        endpoint: parsed.request,
        report_type: parsed.reportType,
        user_id: parsed.user_id,
        chartData: JSON.parse(txt),
        ...parsed
      };
      
      // Fire and forget
      fetch(orchestratorUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
        },
        body: JSON.stringify(orchestratorPayload),
      }).catch(() => {}); // Silent fail
    }
    
    // Return Swiss response
    return new Response(txt, { status: swiss.status, headers: corsHeaders });
    
  } catch(err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
