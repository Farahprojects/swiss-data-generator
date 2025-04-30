import { serve } from "https://deno.land/std/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ───── ENV ----------------------------------------------------------------*/
const SWISS_API = Deno.env.get("SWISS_EPH_API_URL")!;
if (!SWISS_API) throw new Error("SWISS_EPH_API_URL env var missing.");

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEO_KEY = Deno.env.get("GOOGLE_API_KEY")!; // Google server‑side key
const GEO_TAB = Deno.env.get("GEOCODE_CACHE_TABLE") ?? "geo_cache"; // cache table
const GEO_TTL = +(Deno.env.get("GEOCODE_TTL_MIN") ?? "1440"); // minutes

const sb = createClient(SB_URL, SB_KEY);

/* ───── 1. synonym → canonical map -----------------------------------------*/
const CANON: Record<string, string> = {
  natal: "natal", birth: "natal", natal_chart: "natal",
  transits: "transits", transition: "transits", daily_transits: "transits",
  progressions: "progressions", progressed: "progressions",
  return: "return", solar_return: "return", lunar_return: "return", yearly_cycle: "return",
  relationship: "synastry", synastry: "synastry", compatibility: "synastry", composite: "synastry",
  positions: "positions",
  moonphases: "moonphases", phases: "moonphases",
  body_matrix: "body_matrix", body: "body_matrix", biorhythm: "body_matrix"
};

/* ───── 2. friendly-house alias → Swiss letter -----------------------------*/
const HOUSE_ALIASES: Record<string, string> = {
  "placidus": "P", "koch": "K", "whole-sign": "W", "equal": "A"
};

/* ───── 3. loose schema (pass‑through unknown keys) -------------------------*/
const Base = z.object({ request: z.string().nonempty() }).passthrough();

/* ───── 4. helper: ensure we have lat/lon (with Supabase cache + Google) ----*/
async function ensureLatLon(obj: any) {
  if ((obj.latitude !== undefined && obj.longitude !== undefined) || !obj.location) return obj;

  const place: string = String(obj.location).trim();

  // 4‑a: try cache
  const { data: cached, error } = await sb
    .from(GEO_TAB)
    .select("lat, lon, updated_at")
    .eq("place", place)
    .maybeSingle();

  if (!error && cached) {
    const ageMin = (Date.now() - Date.parse(cached.updated_at)) / 60000;
    if (ageMin < GEO_TTL) {
      return { ...obj, latitude: cached.lat, longitude: cached.lon };
    }
  }

  // 4‑b: Google Geocoding
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(place)}&key=${GEO_KEY}`;
  const g = await fetch(url).then(r => r.json());
  if (g.status !== "OK") throw new Error(`Geocode failed: ${g.status}`);
  const { lat, lng } = g.results[0].geometry.location;

  // 4‑c: upsert cache (best‑effort)
  await sb.from(GEO_TAB).upsert({ place, lat, lon: lng }).select();

  return { ...obj, latitude: lat, longitude: lng };
}

/* ───── 5. Swiss flag/house injector ---------------------------------------*/
function normalise(payload: any): any {
  const out = { ...payload };

  // derive sidereal from system
  if (out.system && out.sidereal === undefined) {
    out.sidereal = out.system.toLowerCase() === "vedic";
  }

  // house alias → letter
  if (out.house && !out.settings?.house_system) {
    const letter = HOUSE_ALIASES[out.house.toLowerCase()];
    if (letter) {
      out.settings = { ...(out.settings ?? {}), house_system: letter };
    }
  }

  // explicit house_system alias mapping
  if (out.house_system && !out.settings?.house_system) {
    const letter = HOUSE_ALIASES[out.house_system.toLowerCase()] ?? out.house_system;
    out.settings = { ...(out.settings ?? {}), house_system: letter };
    delete out.house_system;
  }

  return out;
}

/* ───── 6. gateway handler --------------------------------------------------*/
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null);

  try {
    const bodyRaw = await req.json();
    const body = Base.parse(bodyRaw);
    const canon = CANON[body.request?.toLowerCase()];
    if (!canon) throw new Error(`Unknown request type "${body.request}"`);

    /* ---------- relationship / synastry --------------------------------*/
    if (canon === "synastry") {
      if (!body.person_a || !body.person_b) throw new Error("person_a & person_b required");
      const aEnriched = await ensureLatLon(body.person_a);
      const bEnriched = await ensureLatLon(body.person_b);
      const swissPayload = {
        person_a: normalise(aEnriched),
        person_b: normalise(bEnriched)
      };
      const r = await fetch(`${SWISS_API}/synastry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(swissPayload)
      });
      return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
    }

    /* ---------- moonphases / positions (GET) ---------------------------*/
    if (canon === "moonphases") {
      const year = body.year ?? new Date().getFullYear();
      const r = await fetch(`${SWISS_API}/moonphases?year=${year}`);
      return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
    }
    if (canon === "positions") {
      const qs = new URLSearchParams({
        utc: body.utc ?? new Date().toISOString(),
        sidereal: String(body.sidereal ?? false)
      });
      const r = await fetch(`${SWISS_API}/positions?${qs}`);
      return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });
    }

    /* ---------- single‑chart POST tasks -------------------------------*/
    const enriched = await ensureLatLon(body);
    const swissPayload = normalise({ ...enriched });
    delete swissPayload.request;

    const ROUTE: Record<string, string> = {
      natal: "natal",
      transits: "transits",
      progressions: "progressions",
      return: "return",
      body_matrix: "body_matrix"
    };
    const path = ROUTE[canon as keyof typeof ROUTE];
    if (!path) throw new Error("Routing not implemented for " + canon);

    const r = await fetch(`${SWISS_API}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(swissPayload)
    });
    return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
});
