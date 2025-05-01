// supabase/functions/_shared/translator.ts
// Pure helper module – NO Edge Function wrapper
// Exported `translate()` returns { status, text } so other functions can await it.

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*──────────────────── ENV */
const SWISS_API = Deno.env.get("SWISS_EPH_API_URL")!;
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
  positions:"positions", moonphases:"moonphases", phases:"moonphases",
  body_matrix:"body_matrix", body:"body_matrix", biorhythm:"body_matrix",
};
const HOUSE_ALIASES: Record<string,string> = { "placidus":"P","koch":"K","whole-sign":"W","equal":"A" };

/*──────────────────── schema */
const Base = z.object({ request: z.string().nonempty() }).passthrough();

/*──────────────────── helpers */
async function ensureLatLon(obj:any){
  if((obj.latitude!==undefined&&obj.longitude!==undefined)||!obj.location) return obj;
  const place = String(obj.location).trim();
  const {data}=await sb.from(GEO_TAB).select("lat,lon,updated_at").eq("place",place).maybeSingle();
  if(data){
    const age=(Date.now()-Date.parse(data.updated_at))/60000;
    if(age < GEO_TTL) return {...obj, latitude:data.lat, longitude:data.lon};
  }
  const url=`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(place)}&key=${GEO_KEY}`;
  const g=await fetch(url).then(r=>r.json());
  if(g.status!=="OK") throw new Error(`Geocode failed: ${g.status}`);
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
  const body = Base.parse(raw);
  const canon = CANON[body.request.toLowerCase()];
  if(!canon) return { status:400, text: JSON.stringify({error:`Unknown request ${body.request}`}) };

  /*─ relationship ─*/
  if(canon==="synastry"){
    if(!body.person_a||!body.person_b) return {status:400,text:JSON.stringify({error:"person_a & person_b required"})};
    const a = normalise(await ensureLatLon(body.person_a));
    const b = normalise(await ensureLatLon(body.person_b));
    const r = await fetch(`${SWISS_API}/synastry`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({person_a:a,person_b:b}) });
    return { status:r.status, text: await r.text() };
  }

  /*─ simple GETs ─*/
  if(canon==="moonphases"){
    const year = body.year ?? new Date().getFullYear();
    const r = await fetch(`${SWISS_API}/moonphases?year=${year}`);
    return { status:r.status, text: await r.text() };
  }
  if(canon==="positions"){
    const qs = new URLSearchParams({ utc: body.utc ?? new Date().toISOString(), sidereal: String(body.sidereal ?? false) });
    const r = await fetch(`${SWISS_API}/positions?${qs}`);
    return { status:r.status, text: await r.text() };
  }

  /*─ POST chart routes ─*/
  const enriched = normalise(await ensureLatLon(body));
  delete enriched.request;
  const ROUTE:Record<string,string>={natal:"natal",transits:"transits",progressions:"progressions",return:"return",body_matrix:"body_matrix"};
  const path = ROUTE[canon as keyof typeof ROUTE];
  if(!path) return { status:400, text: JSON.stringify({error:`Routing not implemented for ${canon}`}) };
  const r = await fetch(`${SWISS_API}/${path}`,{ method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(enriched) });
  return { status:r.status, text: await r.text() };
}
