// supabase/functions/_shared/translator.ts
// Pure helper module – NO Edge Function wrapper
// Exported `translate()` returns { status, text } so other functions can await it.

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
  natal:         "natal",
  birth:         "natal",
  natal_chart:   "natal",

  transits:      "transits",
  transition:    "transits",
  daily_transits:"transits",

  progressions:  "progressions",
  progressed:    "progressions",

  return:        "return",
  solar_return:  "return",
  lunar_return:  "return",
  yearly_cycle:  "return",

  relationship:  "synastry",
  synastry:      "synastry",
  compatibility: "synastry",
  composite:     "synastry",

  positions:     "positions",
  moonphases:    "moonphases",
  phases:        "moonphases",

  "body-matrix": "body-matrix",
  body:          "body-matrix",
  biorhythm:     "body-matrix",

  sync:          "sync",
};

const HOUSE_ALIASES: Record<string,string> = {
  placidus: "P",
  koch:     "K",
  "whole-sign":"W",
  equal:    "A",
};

/*──────────────────── schema */
// Allow either `request` **or** `type` so you can be flexible:
const Base = z.object({
  request: z.string().nonempty().optional(),
  type:    z.string().nonempty().optional(),
}).refine(o => o.request ?? o.type, { message:"'request' (or 'type') is required" }).passthrough();

/*──────────────────── logger */
async function logToSupabase(
  requestType: string,
  requestPayload: any,
  responseStatus: number,
  responsePayload: any,
  processingTime: number,
  errorMessage?: string,
) {
  const { error } = await sb.from("translator_logs").insert({
    request_type:      requestType,
    request_payload:   requestPayload,
    response_status:   responseStatus,
    response_payload:  responsePayload,
    processing_time_ms:processingTime,
    error_message:     errorMessage,
  });
  if (error) console.error("Failed to log to Supabase:", error.message);
}

/*──────────────────── helpers */
async function ensureLatLon(obj: any) {
  if ((obj.latitude !== undefined && obj.longitude !== undefined) || !obj.location) return obj;

  const place = String(obj.location).trim();
  const { data } = await sb.from(GEO_TAB)
                           .select("lat,lon,updated_at")
                           .eq("place", place)
                           .maybeSingle();

  if (data) {
    const age = (Date.now() - Date.parse(data.updated_at)) / 60000;
    if (age < GEO_TTL) return { ...obj, latitude: data.lat, longitude: data.lon };
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json` +
              `?address=${encodeURIComponent(place)}&key=${GEO_KEY}`;
  const g = await fetch(url).then(r => r.json());
  if (g.status !== "OK") throw new Error(`Geocode failed: ${g.status}`);

  const { lat, lng } = g.results[0].geometry.location;
  await sb.from(GEO_TAB).upsert({ place, lat, lon: lng }).select();
  return { ...obj, latitude: lat, longitude: lng };
}

function normalise(p: any) {
  const out = { ...p };

  if (out.system && out.sidereal === undefined)
    out.sidereal = out.system.toLowerCase() === "vedic";

  if (out.house && !out.settings?.house_system) {
    const letter = HOUSE_ALIASES[out.house.toLowerCase()];
    if (letter) out.settings = { ...(out.settings ?? {}), house_system: letter };
  }

  if (out.house_system && !out.settings?.house_system) {
    const letter = HOUSE_ALIASES[out.house_system.toLowerCase()] ?? out.house_system;
    out.settings = { ...(out.settings ?? {}), house_system: letter };
    delete out.house_system;
  }
  return out;
}

/*──────────────────── translate */
export async function translate(raw: any): Promise<{ status: number; text: string }> {
  const start = Date.now();
  let reqType = "unknown";

  try {
    const body      = Base.parse(raw);
    const requested = (body.request ?? body.type)!.toLowerCase();
    const canon     = CANON[requested];

    if (!canon) {
      throw new Error(`Unknown request type: ${requested}`);
    }
    reqType = canon;

    /*──────── relationship (synastry) ────────*/
    if (canon === "synastry") {
      if (!body.person_a || !body.person_b) {
        return { status: 400, text: `{"error":"person_a & person_b required"}` };
      }
      const a = normalise(await ensureLatLon(body.person_a));
      const b = normalise(await ensureLatLon(body.person_b));

      const resp = await fetch(`${SWISS_API}/synastry`, {
        method:  "POST",
        headers: { "Content-Type":"application/json" },
        body:    JSON.stringify({ person_a: a, person_b: b }),
      });

      const txt = await resp.text();
      await logToSupabase(reqType, { person_a: a, person_b: b }, resp.status, txt, Date.now() - start);
      return { status: resp.status, text: txt };
    }

    /*──────── simple GETs ────────*/
    if (canon === "moonphases") {
      const year = body.year ?? new Date().getFullYear();
      const resp = await fetch(`${SWISS_API}/moonphases?year=${year}`);
      const txt  = await resp.text();
      await logToSupabase(reqType, { year }, resp.status, txt, Date.now() - start);
      return { status: resp.status, text: txt };
    }

    if (canon === "positions") {
      const qs = new URLSearchParams({
        utc:      body.utc ?? new Date().toISOString(),
        sidereal: String(body.sidereal ?? false),
      });
      const resp = await fetch(`${SWISS_API}/positions?${qs}`);
      const txt  = await resp.text();
      await logToSupabase(reqType, { utc: body.utc, sidereal: body.sidereal }, resp.status, txt, Date.now() - start);
      return { status: resp.status, text: txt };
    }

    /*──────── POST chart routes ────────*/
    const enriched = normalise(await ensureLatLon(body));
    delete enriched.request;
    delete enriched.type;

    const ROUTE: Record<string, string> = {
      natal:        "natal",
      transits:     "transits",
      sync:         "sync",
      progressions: "progressions",
      return:       "return",
      "body-matrix":"body-matrix",
    };

    const path = ROUTE[canon];
    if (!path) throw new Error(`Routing not implemented for ${canon}`);

    const resp = await fetch(`${SWISS_API}/${path}`, {
      method:  "POST",
      headers: { "Content-Type":"application/json" },
      body:    JSON.stringify(enriched),
    });

    const txt = await resp.text();
    await logToSupabase(reqType, enriched, resp.status, txt, Date.now() - start);
    return { status: resp.status, text: txt };
  } catch (err) {
    await logToSupabase(reqType, raw, 500, { error: (err as Error).message }, Date.now() - start);
    return { status: 500, text: JSON.stringify({ error: (err as Error).message }) };
  }
}
