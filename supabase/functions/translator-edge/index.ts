// updated for deployment 

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
const VERSION = "translator-edge v3.3 (2025‑07‑22)";

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
  reportType:    z.string().optional(),  // Changed from 'report' to 'reportType'
  is_guest:      z.boolean().optional(),
  user_id:       z.string().optional(),
  skip_logging:  z.boolean().optional(),
  request_id:    z.string().optional(),  // Added for performance correlation

  // Flexible payload support
  name:          z.string().optional(),
  person_a:      z.any().optional(),
  person_b:      z.any().optional(),
  year:          z.number().optional(),
  return_date:   z.string().optional(),
}).refine((v) => {
  // If utc or local supplied we can proceed
  if (v.utc || v.local) return true;
  // If person_a exists we defer validation further down
  if (v.person_a) return true;
  // Otherwise need date+time pair for chart routes
  const hasDate = v.date || v.birth_date;
  const hasTime = v.time || v.birth_time;
  if (hasDate && hasTime) return true;
  // For endpoints that don't require birth data
  if (["moonphases", "positions"].includes(v.request?.toLowerCase() || "")) return true;
  return false;
}, { message: "Provide 'utc' or 'local', or a birth_date + birth_time pair." });

/** Parse various timestamp combos into an ISO‑UTC string. */
export function toUtcISO(parts: { date?: string; time?: string; tz?: string; local?: string; birth_date?: string; birth_time?: string; location?: string }): string {
  console.log(`[toUtcISO] Input parts:`, {
    date: parts.date,
    birth_date: parts.birth_date,
    time: parts.time,
    birth_time: parts.birth_time,
    tz: parts.tz,
    local: parts.local,
    location: parts.location
  });

  if (parts.local) {
    const d = new Date(parts.local);
    if (isNaN(d.getTime())) throw new Error("Invalid 'local' timestamp");
    console.log(`[toUtcISO] Using local timestamp: ${parts.local} -> ${d.toISOString()}`);
    return d.toISOString();
  }
  
  const actualDate = parts.birth_date || parts.date;
  const actualTime = parts.birth_time || parts.time;
  
  console.log(`[toUtcISO] Extracted date: ${actualDate}, time: ${actualTime}, tz: ${parts.tz}`);

  if (actualDate) {
    if (actualTime) {
      const birthDate = new Date(actualDate);
      if (isNaN(birthDate.getTime())) throw new Error("Invalid date");
      const year = birthDate.getUTCFullYear();
      const month = birthDate.getUTCMonth();
      const day = birthDate.getUTCDate();
      const [H, M] = actualTime.split(":" as const).map(Number);
      const tz = parts.tz || "UTC";
      
      console.log(`[toUtcISO] Parsed components: year=${year}, month=${month}, day=${day}, hour=${H}, minute=${M}, tz=${tz}`);
      
      const provisional = new Date(Date.UTC(year, month, day, H, M));
      console.log(`[toUtcISO] Provisional UTC date (before timezone adjustment): ${provisional.toISOString()}`);
      
      try {
        const fmt = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          timeZoneName: "shortOffset",
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", hourCycle: "h23"
        });
        const off = fmt.formatToParts(provisional).find(p => p.type === "timeZoneName")?.value ?? "GMT+0";
        console.log(`[toUtcISO] Timezone offset string: ${off}`);
        
        const m = off.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
        if (!m) throw new Error("bad offset");
        const sign = m[1] === "-" ? -1 : 1;
        const hOff = +m[2], minOff = +(m[3]||0);
        const total = sign * (hOff * 60 + minOff);
        
        console.log(`[toUtcISO] Offset calculation: sign=${sign}, hours=${hOff}, minutes=${minOff}, total_minutes=${total}`);
        
        const finalUtc = new Date(provisional.getTime() - total * 60000);
        console.log(`[toUtcISO] Final UTC timestamp: ${finalUtc.toISOString()}`);
        return finalUtc.toISOString();
      } catch(e) {
        console.log(`[toUtcISO] Timezone conversion failed, using provisional: ${provisional.toISOString()}, error:`, e);
        return provisional.toISOString();
      }
    }
    const d = new Date(actualDate);
    if (isNaN(d.getTime())) throw new Error("Invalid date");
    console.log(`[toUtcISO] Date only, returning: ${d.toISOString()}`);
    return d.toISOString();
  }

  throw new Error("Both date and time are required");
}

/** Map user house aliases → Swiss codes. */
const HOUSE_ALIASES: Record<string,string> = { placidus:"P", koch:"K", "whole-sign":"W", equal:"A" };
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
  console.log(`[inferTimezone] Called with obj:`, { lat: obj.latitude, lng: obj.longitude, tz: obj.tz });
  if (obj.tz) {
    console.log(`[inferTimezone] Using existing tz: ${obj.tz}`);
    return obj.tz;
  }
  if (obj.latitude!==undefined&&obj.longitude!==undefined){
    const url = `https://maps.googleapis.com/maps/api/timezone/json?location=${obj.latitude},${obj.longitude}&timestamp=0&key=${GEO_KEY}`;
    console.log(`[inferTimezone] Calling Google Timezone API: ${url.replace(GEO_KEY, 'REDACTED')}`);
    const tf = await fetch(url).then(r=>r.json());
    console.log(`[inferTimezone] API response:`, tf);
    if (tf.status==="OK"&&tf.timeZoneId) {
      console.log(`[inferTimezone] Returning timezone: ${tf.timeZoneId}`);
      return tf.timeZoneId;
    }
    console.log(`[inferTimezone] API failed or no timeZoneId`);
  } else {
    console.log(`[inferTimezone] Missing lat/lng coordinates`);
  }
  console.log(`[inferTimezone] Returning null (fallback)`);
  return null;
}

/*──────────────── simple orchestrator call ---------------------------*/
async function callOrchestratorFireForget(requestData: any, swissData: any) {
  try {
    const orchestratorPayload = {
      endpoint: requestData.request,
      report_type: requestData.reportType,
      user_id: requestData.user_id,
      apiKey: requestData.api_key,
      is_guest: !!requestData.is_guest,
      chartData: { ...swissData, person_a_name: requestData.person_a?.name, person_b_name: requestData.person_b?.name },
      ...requestData
    };
    
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/report-orchestrator`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
      },
      body: JSON.stringify(orchestratorPayload),
    }).catch(e => console.error("Orchestrator call failed:", e));
  } catch(e) { 
    console.error("Orchestrator call error:", e); 
  }
}

/*──────────────── logging (OPTIMIZED) -------------------------------------*/
async function logTranslatorAsync(run:{request_type:string;request_payload:any;swiss_data:any;swiss_status:number;processing_ms:number;swiss_api_ms:number;error?:string;google_geo:boolean;translator_payload:any;user_id?:string;skip:boolean;is_guest?:boolean}){
  if(run.skip) return;
  
  // Use background processing for logging to avoid blocking
  const logPromise = (async () => {
    try {
      const { error } = await sb.from("translator_logs").insert({
        request_type: run.request_type,
        request_payload: run.request_payload,
        translator_payload: run.translator_payload,
        response_status: run.swiss_status,
        swiss_data: run.swiss_data,
        processing_time_ms: run.swiss_api_ms, // Now logging actual Swiss API time
        error_message: run.error,
        google_geo: run.google_geo,
        user_id: run.user_id ?? null,
        is_guest: run.is_guest ?? false,
        swiss_error: run.swiss_status !== 200,
      });
      if(error) console.error("[translator] log fail", error.message);
    } catch(e) {
      console.error("[translator] async log exception:", e);
    }
  })();

  // Use EdgeRuntime.waitUntil if available, otherwise fire and forget
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
    EdgeRuntime.waitUntil(logPromise);
  } else {
    // Fire and forget - don't await
    logPromise.catch(e => console.error("[translator] background log error:", e));
  }
}

/*──────────────── Canon ----------------------------------------------------*/
const CANON:Record<string,string>={ natal:"natal",transits:"transits",progressions:"progressions",return:"return",synastry:"synastry",compatibility:"synastry",positions:"positions",moonphases:"moonphases",body:"body_matrix",body_matrix:"body_matrix",sync:"sync",essence:"essence",flow:"flow",mindset:"mindset",monthly:"monthly",focus:"focus" };

/*──────────────── Edge Function (SIMPLIFIED) -------------------------------*/
serve(async (req)=>{
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers:corsHeaders});
  const reqId = crypto.randomUUID().slice(0,8);
  let skipLogging=false, requestType="unknown", googleGeo=false, userId:string|undefined, isGuest=false;
  
  try{
    const rawBodyText = await req.text();
    let rawBody: any;
    try {
      rawBody = JSON.parse(rawBodyText);
      userId = rawBody.user_id;
      isGuest = !!rawBody.is_guest;
    } catch (parseErr) {
      console.error(`[translator-edge-${reqId}] JSON parse failed:`, parseErr);
      throw new Error("Invalid JSON in request body");
    }
    
    function normalisePerson(src:any={}):any{
      return {
        birth_date: src.birth_date||src.date||null,
        birth_time: src.birth_time||src.time||null,
        location:   src.location||src.city||"",
        latitude:   src.latitude??src.lat??null,
        longitude:  src.longitude??src.lon??null,
        tz:         src.tz||src.timezone||"",
        name:       src.name||"",
        house_system: src.house_system||src.hsys||"",
      };
    }
    function normaliseBody(input:any){
      if(input.person_a||input.person_b){
        input.person_a = normalisePerson(input.person_a||{});
        if(input.person_b) input.person_b = normalisePerson(input.person_b);
      }else{
        input.person_a = normalisePerson(input);
      }
      return input;
    }
    
    const body = normaliseBody(rawBody);
    skipLogging = body.skip_logging===true;
    const parsed = baseSchema.parse(body);
    requestType = parsed.request.trim().toLowerCase();
    const canon = CANON[requestType];
    if(!canon) throw new Error(`Unknown request '${parsed.request}'`);

    // Build Swiss API payload
    let payload:any;
    if(canon==="sync" && parsed.person_a && parsed.person_b){
      const {data:pa,googleGeoUsed:g1}=await ensureLatLon(parsed.person_a);
      const tzA=await inferTimezone(pa);
      pa.tz = tzA || pa.tz || "UTC";
      const utcA=toUtcISO({...pa,tz:pa.tz,location:pa.location||""});
      const normA={...normalise(pa),utc:utcA,tz:pa.tz};

      const {data:pb,googleGeoUsed:g2}=await ensureLatLon(parsed.person_b);
      const tzB=await inferTimezone(pb);
      pb.tz = tzB || pb.tz || "UTC";
      const utcB=toUtcISO({...pb,tz:pb.tz,location:pb.location||""});
      const normB={...normalise(pb),utc:utcB,tz:pb.tz};

      googleGeo = g1||g2;
      payload = { person_a: normA, person_b: normB, ...parsed };
    }else{
      const {data:withLatLon,googleGeoUsed} = await ensureLatLon(parsed);
      googleGeo = googleGeoUsed;
      if(["natal","essence","sync","flow","mindset","monthly","focus","progressions","return","transits"].includes(canon)){
        try{
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
        }catch(e){ console.warn(`[translator-edge-${reqId}] UTC gen fail`, e); }
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

    // Call Swiss API
    const url = `${SWISS_API}/${canon}`;
    const swiss = await fetch(url,{ 
      method:["moonphases","positions"].includes(canon)?"GET":"POST", 
      headers:{"Content-Type":"application/json"}, 
      body:["moonphases","positions"].includes(canon)?undefined:JSON.stringify(payload) 
    });
    const txt = await swiss.text();
    const swissData = (()=>{ try{return JSON.parse(txt);}catch{return { raw:txt }; }})();

    // Log to translator_logs (fire-and-forget)
    logTranslatorAsync({ 
      request_type:canon, 
      request_payload:body, 
      swiss_data:swissData, 
      swiss_status:swiss.status, 
      processing_ms:0, 
      swiss_api_ms:0,
      error: swiss.ok?undefined:`Swiss ${swiss.status}`, 
      google_geo:googleGeo, 
      translator_payload:payload, 
      user_id:body.user_id, 
      skip:skipLogging, 
      is_guest:body.is_guest 
    });

    // If we need to pass data to orchestrator, do it and forget
    if(swiss.ok && (body.reportType || (!body.reportType && body.is_guest))) {
      callOrchestratorFireForget(body, swissData);
    }

    // Return Swiss response immediately
    return new Response(txt,{status:swiss.status,headers:corsHeaders});
    
  }catch(err){
    const msg = (err as Error).message;
    console.error(`[translator-edge-${reqId}]`, msg);
    
    // Log error asynchronously
    logTranslatorAsync({ 
      request_type:requestType, 
      request_payload:"n/a", 
      swiss_data:{error:msg}, 
      swiss_status:500, 
      processing_ms:0, 
      swiss_api_ms:0,
      error:msg, 
      google_geo:googleGeo, 
      translator_payload:null, 
      user_id:userId, 
      skip:skipLogging, 
      is_guest:isGuest 
    });
    
    return new Response(JSON.stringify({ error:msg }),{status:500,headers:corsHeaders});
  }
});
