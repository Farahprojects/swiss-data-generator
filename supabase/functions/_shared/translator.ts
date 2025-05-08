// supabase/functions/_shared/translator.ts
// Pure helper module – NO Edge Function wrapper
// Exported translate() returns { status, text } so other functions can await it.

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/*──────────────────── ENV ------------------------------------*/
const SWISS_API = Deno.env.get("SWISS_EPHEMERIS_URL")!;
const SB_URL    = Deno.env.get("SUPABASE_URL")!;
const SB_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEO_KEY   = Deno.env.get("GOOGLE_API_KEY")!;
const GEO_TAB   = Deno.env.get("GEOCODE_CACHE_TABLE") ?? "geo_cache";
const GEO_TTL   = +(Deno.env.get("GEOCODE_TTL_MIN") ?? "1440");

const sb = createClient(SB_URL, SB_KEY);

/*──────────────────── canonical maps ------------------------ */
const CANON: Record<string, string> = {
  natal:         "natal",

  transits:      "transits",

  progressions:  "progressions",

  return:        "return",

  synastry:      "synastry",
  compatibility: "synastry",

  positions:     "positions",
  moonphases:    "moonphases",

  body:          "body_matrix",
  body_matrix:   "body_matrix",

  sync:          "sync",

  /* tracking-only       */
  reports:       "reports",

  /* ========= NEW ENDPOINTS (user-friendly aliases) ================ */
  essence:           "essence",   // natal + current transits bundle

  flow:              "flow",

  mindset:           "mindset",

  monthly:           "monthly",

  focus:             "focus",
  
};
/*──────────────────── misc maps */
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
  googleGeoUsed = false,
) {
  /* extract report tier, if present */
  const reportTier =
    ["standard", "premium"].includes(requestPayload?.report)
      ? requestPayload.report
      : null;

  const { error } = await sb.from("translator_logs").insert({
    request_type:       requestType,
    request_payload:    requestPayload,
    response_status:    responseStatus,
    response_payload:   responsePayload,
    processing_time_ms: processingTime,
    error_message:      errorMessage,
    google_geo:         googleGeoUsed,
    report_tier:        reportTier,
  });
  if (error) console.error("Failed to log to Supabase:", error.message);
}

/*──────────────────── helpers */
async function ensureLatLon(
  obj: any,
): Promise<{ data: any; googleGeoUsed: boolean }> {
  if (
    (obj.latitude !== undefined && obj.longitude !== undefined) ||
    !obj.location
  ) return { data: obj, googleGeoUsed: false };

  const place = String(obj.location).trim();

  /* ---------- cache first ---------- */
  const { data } = await sb
    .from(GEO_TAB)
    .select("lat,lon,updated_at")
    .eq("place", place)
    .maybeSingle();

  if (data) {
    const age = (Date.now() - Date.parse(data.updated_at)) / 60000;
    if (age < GEO_TTL) {
      return {
        data: { ...obj, latitude: data.lat, longitude: data.lon },
        googleGeoUsed: false,
      };
    }
  }

  /* ---------- Google fallback ---------- */
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      place,
    )}&key=${GEO_KEY}`;
  const g = await fetch(url).then((r) => r.json());
  if (g.status !== "OK") throw new Error(`Geocode failed: ${g.status}`);

  const { lat, lng } = g.results[0].geometry.location;
  await sb.from(GEO_TAB).upsert({ place, lat, lon: lng });

  return {
    data: { ...obj, latitude: lat, longitude: lng },
    googleGeoUsed: true,
  };
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
    const letter = HOUSE_ALIASES[out.house_system.toLowerCase()] ??
      out.house_system;
    out.settings = { ...(out.settings ?? {}), house_system: letter };
    delete out.house_system;
  }
  return out;
}

/*──────────────────── translate */
export async function translate(
  raw: any,
): Promise<{ status: number; text: string }> {
  const startTime     = Date.now();
  let   requestType   = "unknown";
  let   googleGeoUsed = false;

  try {
    const body = Base.parse(raw);
    requestType = body.request.trim().toLowerCase();
    const canon = CANON[requestType];

    if (!canon) {
      const err = `Unknown request ${body.request}`;
      await logToSupabase(
        requestType,
        raw,
        400,
        { error: err },
        Date.now() - startTime,
        err,
        googleGeoUsed,
      );
      return { status: 400, text: JSON.stringify({ error: err }) };
    }

    requestType = canon;

    /*──────────────── REPORTS (tracking-only) ─────────────*/
    if (canon === "reports") {
      const msg = "Reports request logged";
      await logToSupabase(
        requestType,
        raw,
        200,
        { message: msg },
        Date.now() - startTime,
        undefined,
        googleGeoUsed,
      );
      return { status: 200, text: JSON.stringify({ message: msg }) };
    }

    /*──────────────── SYNC ───────────────────────────────*/
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
          googleGeoUsed,
        );
        return { status: 400, text: JSON.stringify({ error: err }) };
      }

      const { data: pa, googleGeoUsed: gA } = await ensureLatLon(body.person_a);
      const { data: pb, googleGeoUsed: gB } = await ensureLatLon(body.person_b);
      googleGeoUsed = gA || gB;

      const a = normalise(pa);
      const b = normalise(pb);

      const payload: Record<string, any> = {
        person_a: a,
        person_b: b,
        include_progressions: !!body.include_progressions,
      };
      if (body.date) payload.date = body.date;
      if (body.time) payload.time = body.time;

      const r   = await fetch(`${SWISS_API}/sync`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const txt = await r.text();

      await logToSupabase(
        requestType,
        raw,
        r.status,
        (() => { try { return JSON.parse(txt); } catch { return { raw_response: txt }; } })(),
        Date.now() - startTime,
        !r.ok ? `Swiss API returned ${r.status}` : undefined,
        googleGeoUsed,
      );

      return { status: r.status, text: txt };
    }

    /*──────────────── SYNASTRY ───────────────────────────*/
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
          googleGeoUsed,
        );
        return { status: 400, text: JSON.stringify({ error: err }) };
      }

      const { data: pa, googleGeoUsed: gA } = await ensureLatLon(body.person_a);
      const { data: pb, googleGeoUsed: gB } = await ensureLatLon(body.person_b);
      googleGeoUsed = gA || gB;

      const a = normalise(pa);
      const b = normalise(pb);

      const r   = await fetch(`${SWISS_API}/synastry`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ person_a: a, person_b: b }),
      });
      const txt = await r.text();

      await logToSupabase(
        requestType,
        raw,
        r.status,
        (() => { try { return JSON.parse(txt); } catch { return { raw_response: txt }; } })(),
        Date.now() - startTime,
        !r.ok ? `Swiss API returned ${r.status}` : undefined,
        googleGeoUsed,
      );

      return { status: r.status, text: txt };
    }

    /*──────────────── simple GETs ─────────────────────────*/
    if (canon === "moonphases") {
      const year = body.year ?? new Date().getFullYear();
      const r    = await fetch(`${SWISS_API}/moonphases?year=${year}`);
      const txt  = await r.text();

      await logToSupabase(
        requestType,
        raw,
        r.status,
        (() => { try { return JSON.parse(txt); } catch { return { raw_response: txt }; } })(),
        Date.now() - startTime,
        !r.ok ? `Swiss API returned ${r.status}` : undefined,
        googleGeoUsed,
      );
      return { status: r.status, text: txt };
    }

    if (canon === "positions") {
      const qs = new URLSearchParams({
        utc:      body.utc ?? new Date().toISOString(),
        sidereal: String(body.sidereal ?? false),
      });
      const r   = await fetch(`${SWISS_API}/positions?${qs}`);
      const txt = await r.text();

      await logToSupabase(
        requestType,
        raw,
        r.status,
        (() => { try { return JSON.parse(txt); } catch { return { raw_response: txt }; } })(),
        Date.now() - startTime,
        !r.ok ? `Swiss API returned ${r.status}` : undefined,
        googleGeoUsed,
      );
      return { status: r.status, text: txt };
    }

    *──────────────── POST chart routes ──────────────────*/
    const { data: enrichedRaw, googleGeoUsed: gUsed } = await ensureLatLon(body);
    googleGeoUsed = gUsed;

    const enriched = normalise(enrichedRaw);

    /*------------------------------------------------------
      We no longer need a separate ROUTE map.  The canonical
      value itself *is* the Swiss-API path.
    ------------------------------------------------------*/
    const path = canon;                   // e.g. “mindset”, “monthly”, …

    const r   = await fetch(`${SWISS_API}/${path}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(enriched),
    });
    const txt = await r.text();

    await logToSupabase(
      requestType,
      raw,
      r.status,
      (() => { try { return JSON.parse(txt); } catch { return { raw_response: txt }; } })(),
      Date.now() - startTime,
      !r.ok ? `Swiss API returned ${r.status}` : undefined,
      googleGeoUsed,
    );

    return { status: r.status, text: txt };
  } catch (err) {
    const msg = (err as Error).message;
    await logToSupabase(
      requestType,
      raw,
      500,
      { error: msg },
      Date.now() - startTime,
      msg,
      googleGeoUsed,
    );
    return { status: 500, text: JSON.stringify({ error: msg }) };
  }
}
