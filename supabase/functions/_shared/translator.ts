
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
const CANON: Record<string, string> = {
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

  body:          "body_matrix",
  body_matrix:   "body_matrix",

  sync:          "sync",
};

const HOUSE_ALIASES: Record<string, string> = {
  placidus:    "P",
  koch:        "K",
  "whole-sign":"W",
  equal:       "A",
};

/*──────────────────── schema */
const Base = z.object({ request: z.string().nonempty() }).passthrough();

/*──────────────────── logger */
async function logToSupabase(
  requestType: string,
  requestPayload: any,
  responseStatus: number,
  responsePayload: any,
  processingTime: number,
  errorMessage?: string,
  googleGeoUsed: boolean = false
) {
  const { error } = await sb.from("translator_logs").insert({
    request_type:      requestType,
    request_payload:   requestPayload,
    response_status:   responseStatus,
    response_payload:  responsePayload,
    processing_time_ms:processingTime,
    error_message:     errorMessage,
    google_geo:        googleGeoUsed, // Now storing a simple boolean
  });
  if (error) console.error("Failed to log to Supabase:", error.message);
  else       console.info(`Successfully logged ${requestType} request to Supabase`);
}

/*──────────────────── helpers */
async function ensureLatLon(obj: any) {
  if ((obj.latitude !== undefined && obj.longitude !== undefined) || !obj.location) return obj;

  let googleGeoUsed = false;
  
  const place = String(obj.location).trim();
  const { data } = await sb
    .from(GEO_TAB)
    .select("lat,lon,updated_at")
    .eq("place", place)
    .maybeSingle();

  if (data) {
    const age = (Date.now() - Date.parse(data.updated_at)) / 60000;
    if (age < GEO_TTL) return { ...obj, latitude: data.lat, longitude: data.lon };
  }

  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      place,
    )}&key=${GEO_KEY}`;
  const g = await fetch(url).then((r) => r.json());
  if (g.status !== "OK") throw new Error(`Geocode failed: ${g.status}`);

  const { lat, lng } = g.results[0].geometry.location;
  await sb.from(GEO_TAB).upsert({ place, lat, lon: lng }).select();
  
  // Set googleGeoUsed to true when Google Geocoding API is used
  googleGeoUsed = true;
  
  // Store the flag but don't pass it to downstream API
  const result = { ...obj, latitude: lat, longitude: lng };
  result._googleGeoUsed = googleGeoUsed; // temporary property just for our tracking
  return result;
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
    const letter = HOUSE_ALIASES[out.house_system.toLowerCase()] ?? out.house_system;
    out.settings = { ...(out.settings ?? {}), house_system: letter };
    delete out.house_system;
  }
  return out;
}

/*──────────────────── translate */
export async function translate(
  raw: any,
): Promise<{ status: number; text: string }> {
  const startTime = Date.now();
  let requestType = "unknown";
  let googleGeoUsed = false;

  try {
    const body = Base.parse(raw);
    requestType = body.request.trim().toLowerCase();
    const canon = CANON[requestType];

    // ── DEBUG ----------------------------------------------------------
    console.info("translate(): CANON keys ->", Object.keys(CANON));
    console.info(
      `translate(): '${body.request}' -> '${requestType}', canon='${canon}'`,
    );
    // ------------------------------------------------------------------

    if (!canon) {
      const err = `Unknown request ${body.request}`;
      await logToSupabase(
        requestType,
        raw,
        400,
        { error: err },
        Date.now() - startTime,
        err,
        googleGeoUsed
      );
      return { status: 400, text: JSON.stringify({ error: err }) };
    }

    requestType = canon; // canonical name from here on

    /*──────────────── rich relationship SYNC ───────────────*/
    if (canon === "sync") {
      if (!body.person_a || !body.person_b) {
        const err = "person_a & person_b required";
        await logToSupabase(
          requestType,
          raw,
          400,
          { error: err },
          Date.now() - startTime,
          err,
          googleGeoUsed
        );
        return { status: 400, text: JSON.stringify({ error: err }) };
      }

      const a = normalise(await ensureLatLon(body.person_a));
      const b = normalise(await ensureLatLon(body.person_b));
      
      // Check if Google geocoding was used for either person
      googleGeoUsed = !!(a._googleGeoUsed || b._googleGeoUsed);
      
      // Remove the tracking property before passing to API
      if (a._googleGeoUsed !== undefined) delete a._googleGeoUsed;
      if (b._googleGeoUsed !== undefined) delete b._googleGeoUsed;

      const payload: Record<string, any> = {
        person_a: a,
        person_b: b,
        include_progressions: !!body.include_progressions,
      };
      if (body.date) payload.date = body.date;
      if (body.time) payload.time = body.time;

      console.info(`Calling Swiss API for ${requestType} at /sync`);
      const r = await fetch(`${SWISS_API}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const txt = await r.text();
      const status = r.status;

      const logPayload = () => {
        try {
          return JSON.parse(txt);
        } catch {
          return { raw_response: txt };
        }
      };

      await logToSupabase(
        requestType,
        payload,
        status,
        logPayload(),
        Date.now() - startTime,
        !r.ok ? `Swiss API returned ${status}` : undefined,
        googleGeoUsed
      );

      return { status, text: txt };
    }

    /*──────────────── synastry ─────────────────────────────*/
    if (canon === "synastry") {
      if (!body.person_a || !body.person_b) {
        const err = "person_a & person_b required";
        await logToSupabase(
          requestType,
          raw,
          400,
          { error: err },
          Date.now() - startTime,
          err,
          googleGeoUsed
        );
        return { status: 400, text: JSON.stringify({ error: err }) };
      }

      const a = normalise(await ensureLatLon(body.person_a));
      const b = normalise(await ensureLatLon(body.person_b));
      
      // Check if Google geocoding was used for either person
      googleGeoUsed = !!(a._googleGeoUsed || b._googleGeoUsed);
      
      // Remove the tracking property before passing to API
      if (a._googleGeoUsed !== undefined) delete a._googleGeoUsed;
      if (b._googleGeoUsed !== undefined) delete b._googleGeoUsed;

      console.info(`Calling Swiss API for ${requestType} at /synastry`);
      const r = await fetch(`${SWISS_API}/synastry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_a: a, person_b: b }),
      });

      const txt = await r.text();
      const status = r.status;

      const logPayload = () => {
        try {
          return JSON.parse(txt);
        } catch {
          return { raw_response: txt };
        }
      };

      await logToSupabase(
        requestType,
        { person_a: a, person_b: b },
        status,
        logPayload(),
        Date.now() - startTime,
        !r.ok ? `Swiss API returned ${status}` : undefined,
        googleGeoUsed
      );

      return { status, text: txt };
    }

    /*──────────────── simple GETs ──────────────────────────*/
    if (canon === "moonphases") {
      const year = body.year ?? new Date().getFullYear();
      const r = await fetch(`${SWISS_API}/moonphases?year=${year}`);
      const txt = await r.text();
      const status = r.status;

      await logToSupabase(
        requestType,
        { year },
        status,
        (() => {
          try {
            return JSON.parse(txt);
          } catch {
            return { raw_response: txt };
          }
        })(),
        Date.now() - startTime,
        !r.ok ? `Swiss API returned ${status}` : undefined,
        googleGeoUsed
      );

      return { status, text: txt };
    }

    if (canon === "positions") {
      const qs = new URLSearchParams({
        utc: body.utc ?? new Date().toISOString(),
        sidereal: String(body.sidereal ?? false),
      });
      const r = await fetch(`${SWISS_API}/positions?${qs}`);
      const txt = await r.text();
      const status = r.status;

      await logToSupabase(
        requestType,
        { utc: body.utc, sidereal: body.sidereal },
        status,
        (() => {
          try {
            return JSON.parse(txt);
          } catch {
            return { raw_response: txt };
          }
        })(),
        Date.now() - startTime,
        !r.ok ? `Swiss API returned ${status}` : undefined,
        googleGeoUsed
      );

      return { status, text: txt };
    }

    /*──────────────── POST chart routes ───────────────────*/
    const enriched = normalise(await ensureLatLon(body));
    
    // Extract tracking property
    googleGeoUsed = !!enriched._googleGeoUsed;
    if (enriched._googleGeoUsed !== undefined) delete enriched._googleGeoUsed;
    
    delete enriched.request;

    const ROUTE: Record<string, string> = {
      natal:        "natal",
      transits:     "transits",
      progressions: "progressions",
      return:       "return",
      body_matrix:  "body_matrix",
    };

    const path = ROUTE[canon as keyof typeof ROUTE];
    if (!path) {
      const err = `Routing not implemented for ${canon}`;
      await logToSupabase(
        requestType,
        enriched,
        400,
        { error: err },
        Date.now() - startTime,
        err,
        googleGeoUsed
      );
      return { status: 400, text: JSON.stringify({ error: err }) };
    }

    console.info(`Calling Swiss API for ${requestType} at /${path}`);
    const r = await fetch(`${SWISS_API}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enriched),
    });

    const txt = await r.text();
    const status = r.status;

    await logToSupabase(
      requestType,
      enriched,
      status,
      (() => {
        try {
          return JSON.parse(txt);
        } catch {
          return { raw_response: txt };
        }
      })(),
      Date.now() - startTime,
      !r.ok ? `Swiss API returned ${status}` : undefined,
      googleGeoUsed
    );

    return { status, text: txt };
  } catch (err) {
    const errorMessage = (err as Error).message;
    await logToSupabase(
      requestType,
      raw,
      500,
      { error: errorMessage },
      Date.now() - startTime,
      errorMessage,
      googleGeoUsed
    );
    console.error("Translation error:", errorMessage);
    return { status: 500, text: JSON.stringify({ error: errorMessage }) };
  }
}
