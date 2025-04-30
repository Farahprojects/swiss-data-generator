import { serve } from "https://deno.land/std/http/server.ts";
import { z }     from "https://deno.land/x/zod@v3.22.4/mod.ts";

/* ───── ENV ────────────────────────────────────────────────────── */
const SWISS_API = Deno.env.get("SWISS_EPH_API_URL")!;
if (!SWISS_API) throw new Error("SWISS_EPH_API_URL env var missing.");

/* ───── 1. synonym → canonical map  ────────────────────────────── */
const CANON: Record<string,string> = {
  natal:"natal", birth:"natal", natal_chart:"natal",

  transits:"transits", transition:"transits", daily_transits:"transits",

  progressions:"progressions", progressed:"progressions",

  return:"return", solar_return:"return", lunar_return:"return", yearly_cycle:"return",

  relationship:"synastry", synastry:"synastry", composite:"synastry", compatibility:"synastry",

  positions:"positions",
  moonphases:"moonphases", phases:"moonphases",

  body_matrix:"body_matrix", body:"body_matrix", biorhythm:"body_matrix"
};

/* ───── 2. friendly-house alias → Swiss letter ────────────────── */
const HOUSE_ALIASES: Record<string,string> = {
  "placidus":"P", "koch":"K", "whole-sign":"W", "equal":"A"
};

/* ───── 3. schema (very loose, because we pass unknown keys) ───── */
const Base = z.object({
  request: z.string().nonempty(),
}).passthrough();                         // allow any extra fields

/* ───── 4. helper: inject Swiss flags only if absent ───────────── */
function normalise(payload: any): any {
  const out = { ...payload };

  // infer sidereal from system if sidereal not supplied
  if (out.system && out.sidereal === undefined) {
    out.sidereal = out.system.toLowerCase() === "vedic";
  }

  // friendly house alias → letter
  if (out.house && !out.settings?.house_system) {
    const letter = HOUSE_ALIASES[out.house.toLowerCase()];
    if (letter) {
      out.settings = { ...(out.settings ?? {}), house_system: letter };
    }
  }

  // if they gave "house_system": "koch", map to "K"
  if (out.house_system && !out.settings?.house_system) {
    const letter = HOUSE_ALIASES[out.house_system.toLowerCase()] ?? out.house_system;
    out.settings = { ...(out.settings ?? {}), house_system: letter };
    delete out.house_system;
  }

  return out;
}

/* ───── 5. gateway handler ─────────────────────────────────────── */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null);

  try {
    const bodyRaw = await req.json();
    const body = Base.parse(bodyRaw);
    const canon = CANON[body.request?.toLowerCase()];

    if (!canon) throw new Error(`Unknown request type “${body.request}”`);

    /* --- relationship (needs both charts) -------------------- */
    if (canon === "synastry") {
      if (!body.person_a || !body.person_b) throw new Error("person_a & person_b required");
      const swissPayload = {
        person_a: normalise(body.person_a),
        person_b: normalise(body.person_b)
      };
      const r = await fetch(`${SWISS_API}/synastry`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(swissPayload)
      });
      return new Response(await r.text(), { status:r.status, headers:{ "Content-Type":"application/json" }});
    }

    /* --- moonphases / positions are GET ---------------------- */
    if (canon === "moonphases") {
      const year = body.year ?? new Date().getFullYear();
      const r = await fetch(`${SWISS_API}/moonphases?year=${year}`);
      return new Response(await r.text(), { status:r.status, headers:{ "Content-Type":"application/json" }});
    }
    if (canon === "positions") {
      const qs = new URLSearchParams({
        utc: body.utc ?? new Date().toISOString(),
        sidereal: String(body.sidereal ?? false)
      });
      const r = await fetch(`${SWISS_API}/positions?${qs}`);
      return new Response(await r.text(), { status:r.status, headers:{ "Content-Type":"application/json" }});
    }

    /* --- everything else is POST ----------------------------- */
    const swissPayload = normalise({ ...body });
    delete swissPayload.request;           // Swiss endpoints don't need it

    // route map
    const ROUTE = {
      natal: "natal",
      transits: "transits",
      progressions: "progressions",
      return: "return",
      body_matrix: "body_matrix"
    } as Record<string,string>;

    const path = ROUTE[canon as keyof typeof ROUTE];
    if (!path) throw new Error("Routing not implemented for " + canon);

    const r = await fetch(`${SWISS_API}/${path}`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(swissPayload)
    });
    return new Response(await r.text(), { status:r.status, headers:{ "Content-Type":"application/json" }});

  } catch (err) {
    return new Response(JSON.stringify({ error:(err as Error).message }), {
      status:400,
      headers:{ "Content-Type":"application/json" }
    });
  }
});
