// supabase/functions/_shared/translator.ts
// Pure helper module – NO Edge Function wrapper
// Exported translate() returns { status, text } so other functions can await it.

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*──────────────────── ENV */
const SWISS_API = Deno.env.get("SWISS_EPHEMERIS_URL")!;
const SB_URL    = Deno.env.get("SUPABASE_URL")!;
const SB_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEO_KEY   = Deno.env.get("GOOGLE_API_KEY")!;
const GEO_TAB   = Deno.env.get("GEOCODE_CACHE_TABLE") ?? "geo_cache";
const GEO_TTL   = +(Deno.env.get("GEOCODE_TTL_MIN") ?? "1440");

const sb = createClient(SB_URL, SB_KEY);

/*──────────────────── canonical maps */
const CANON: Record<string,string> = {
  natal:"natal", birth:"natal", natal_chart:"natal",
  transits:"transits", transition:"transits", daily_transits:"transits",
  progressions:"progressions", progressed:"progressions",
  return:"return", solar_return:"return", lunar_return:"return", yearly_cycle:"return",
  relationship:"synastry", synastry:"synastry", compatibility:"synastry", composite:"synastry",
  positions:"positions", moonphases:"moonphases", phases:"moonphases", body:"body_matrix",
  body_matrix:"body_matrix", sync:"sync",
};
const HOUSE_ALIASES: Record<string,string> = { "placidus":"P","koch":"K","whole-sign":"W","equal":"A" };

/*──────────────────── schema */
const Base = z.object({ request: z.string().nonempty() }).passthrough();

/*──────────────────── logger */
async function logToSupabase(requestType: string, requestPayload: any, responseStatus: number, responsePayload: any, processingTime: number, errorMessage?: string) {
  try {
    const { error } = await sb.from('translator_logs').insert({
      request_type: requestType,
      request_payload: requestPayload,
      response_status: responseStatus,
      response_payload: responsePayload,
      processing_time_ms: processingTime,
      error_message: errorMessage
    });

    if (error) {
      console.error("Failed to log to Supabase:", error.message);
    } else {
      console.info(Successfully logged ${requestType} request to Supabase);
    }
  } catch (e) {
    console.error("Error logging to Supabase:", e.message);
  }
}

/*──────────────────── helpers */
async function ensureLatLon(obj:any){
  if((obj.latitude!==undefined&&obj.longitude!==undefined)||!obj.location) return obj;
  const place = String(obj.location).trim();
  const {data}=await sb.from(GEO_TAB).select("lat,lon,updated_at").eq("place",place).maybeSingle();
  if(data){
    const age=(Date.now()-Date.parse(data.updated_at))/60000;
    if(age < GEO_TTL) return {...obj, latitude:data.lat, longitude:data.lon};
  }
  const url=https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(place)}&key=${GEO_KEY};
  const g=await fetch(url).then(r=>r.json());
  if(g.status!=="OK") throw new Error(Geocode failed: ${g.status});
  const {lat,lng}=g.results[0].geometry.location;
  await sb.from(GEO_TAB).upsert({place,lat,lon:lng}).select();
  return {...obj, latitude:lat, longitude:lng};
}

function normalise(p:any){
  const out={...p};
  if(out.system && out.sidereal===undefined) out.sidereal = out.system.toLowerCase()==="vedic";
  if(out.house && !out.settings?.house_system){
    const letter = HOUSE_ALIASES[out.house.toLowerCase()];
    if(letter) out.settings={...(out.settings??{}),house_system:letter};
  }
  if(out.house_system && !out.settings?.house_system){
    const letter = HOUSE_ALIASES[out.house_system.toLowerCase()] ?? out.house_system;
    out.settings={...(out.settings??{}),house_system:letter};
    delete out.house_system;
  }
  return out;
}

/*──────────────────── translate */
export async function translate(raw:any):Promise<{status:number;text:string}>{
  const startTime = Date.now();
  let requestType: string;
  let responseStatus: number;
  let responseText: string;
  let errorMessage: string | undefined;
  
  try {
  const body = Base.parse(raw);
  requestType = body.request.trim().toLowerCase();
  const canon = CANON[requestType];

  // ── DEBUG ----------------------------------------------------------
  console.info("translate(): CANON keys ->", Object.keys(CANON));
  console.info(`translate(): '${body.request}' -> '${requestType}', canon='${canon}'`);
  // ------------------------------------------------------------------

  if (!canon) {
    responseStatus = 400;
    responseText = JSON.stringify({ error: `Unknown request ${body.request}` });
    errorMessage = `Unknown request type: ${body.request}`;
    await logToSupabase(
      body.request,
      raw,
      responseStatus,
      { error: errorMessage },
      Date.now() - startTime,
      errorMessage
    );
    return { status: responseStatus, text: responseText };
  }

  requestType = canon; // Use canonical request type for logging

    /*─ relationship ─*/
    if(canon==="synastry"){
      if(!body.person_a||!body.person_b) {
        responseStatus = 400;
        responseText = JSON.stringify({error:"person_a & person_b required"});
        errorMessage = "Missing person_a or person_b in synastry request";
        await logToSupabase(requestType, raw, responseStatus, {error: errorMessage}, Date.now() - startTime, errorMessage);
        return { status: responseStatus, text: responseText };
      }
      const a = normalise(await ensureLatLon(body.person_a));
      const b = normalise(await ensureLatLon(body.person_b));
      console.info(Calling Swiss API for ${requestType} with persons A and B);
      const r = await fetch(${SWISS_API}/synastry, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({person_a:a,person_b:b}) });
      responseStatus = r.status;
      responseText = await r.text();
      
      if (!r.ok) {
        errorMessage = Swiss API returned ${r.status};
        console.error(Error in ${requestType} request:, errorMessage);
      } else {
        console.info(Successfully processed ${requestType} request);
      }
      
      try {
        const responsePayload = JSON.parse(responseText);
        await logToSupabase(requestType, {person_a: a, person_b: b}, responseStatus, responsePayload, Date.now() - startTime, errorMessage);
      } catch (e) {
        await logToSupabase(requestType, {person_a: a, person_b: b}, responseStatus, {raw_response: responseText}, Date.now() - startTime, errorMessage);
      }
      
      return { status: responseStatus, text: responseText };
    }

    /*─ simple GETs ─*/
    if(canon==="moonphases"){
      const year = body.year ?? new Date().getFullYear();
      console.info(Calling Swiss API for ${requestType} with year ${year});
      const r = await fetch(${SWISS_API}/moonphases?year=${year});
      responseStatus = r.status;
      responseText = await r.text();
      
      if (!r.ok) {
        errorMessage = Swiss API returned ${r.status};
        console.error(Error in ${requestType} request:, errorMessage);
      } else {
        console.info(Successfully processed ${requestType} request);
      }
      
      try {
        const responsePayload = JSON.parse(responseText);
        await logToSupabase(requestType, {year}, responseStatus, responsePayload, Date.now() - startTime, errorMessage);
      } catch (e) {
        await logToSupabase(requestType, {year}, responseStatus, {raw_response: responseText}, Date.now() - startTime, errorMessage);
      }
      
      return { status: responseStatus, text: responseText };
    }
    
    if(canon==="positions"){
      const qs = new URLSearchParams({ utc: body.utc ?? new Date().toISOString(), sidereal: String(body.sidereal ?? false) });
      console.info(Calling Swiss API for ${requestType} with params ${qs});
      const r = await fetch(${SWISS_API}/positions?${qs});
      responseStatus = r.status;
      responseText = await r.text();
      
      if (!r.ok) {
        errorMessage = Swiss API returned ${r.status};
        console.error(Error in ${requestType} request:, errorMessage);
      } else {
        console.info(Successfully processed ${requestType} request);
      }
      
      try {
        const responsePayload = JSON.parse(responseText);
        await logToSupabase(requestType, {utc: body.utc, sidereal: body.sidereal}, responseStatus, responsePayload, Date.now() - startTime, errorMessage);
      } catch (e) {
        await logToSupabase(requestType, {utc: body.utc, sidereal: body.sidereal}, responseStatus, {raw_response: responseText}, Date.now() - startTime, errorMessage);
      }
      
      return { status: responseStatus, text: responseText };
    }

    /*─ POST chart routes ─*/
    const enriched = normalise(await ensureLatLon(body));
    delete enriched.request;
    const ROUTE:Record<string,string>={natal:"natal",transits:"transits",sync:"sync",progressions:"progressions",return:"return",body_matrix:"body_matrix"};
    const path = ROUTE[canon as keyof typeof ROUTE];
    
    if(!path) {
      responseStatus = 400;
      responseText = JSON.stringify({error:Routing not implemented for ${canon}});
      errorMessage = Routing not implemented for ${canon};
      await logToSupabase(requestType, enriched, responseStatus, {error: errorMessage}, Date.now() - startTime, errorMessage);
      return { status: responseStatus, text: responseText };
    }
    
    console.info(Calling Swiss API for ${requestType} at path /${path});
    const r = await fetch(${SWISS_API}/${path},{ method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(enriched) });
    responseStatus = r.status;
    responseText = await r.text();
    
    if (!r.ok) {
      errorMessage = Swiss API returned ${r.status};
      console.error(Error in ${requestType} request:, errorMessage);
    } else {
      console.info(Successfully processed ${requestType} request);
    }
    
    try {
      const responsePayload = JSON.parse(responseText);
      await logToSupabase(requestType, enriched, responseStatus, responsePayload, Date.now() - startTime, errorMessage);
    } catch (e) {
      await logToSupabase(requestType, enriched, responseStatus, {raw_response: responseText}, Date.now() - startTime, errorMessage);
    }
    
    return { status: responseStatus, text: responseText };
  } catch (err) {
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    responseStatus = 500;
    errorMessage = (err as Error).message;
    responseText = JSON.stringify({error: errorMessage});
    
    // Log the error, using a default requestType if we couldn't determine it
    await logToSupabase(
      requestType || "unknown", 
      raw, 
      responseStatus, 
      {error: errorMessage}, 
      processingTime,
      errorMessage
    );
    
    console.error("Translation error:", errorMessage);
    return { status: responseStatus, text: responseText };
  }
}
