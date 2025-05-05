
/********************************************************************
 *  "Body Matrix" – daily rhythm data aggregator
 *
 *  • Lunar phase (nearest major phase name)
 *  • Moon transits to natal Moon / Mars / ASC
 *  • Mars transits to natal planets
 *  • Planetary day ruler + current planetary hour ruler
 *  • Circadian label (simple four-block model)
 *
 *  Requires env var:  SWISS_EPHEMERIS_URL
 *******************************************************************/
import { serve } from "https://deno.land/std/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { NatalArgs, toSwissNatal } from "../_shared/translator.ts";

const SWISS = Deno.env.get("SWISS_EPHEMERIS_URL")!;  // Using the correct secret key
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/* ── input schema (adds 'analysis_date') ───────────────────────── */
const BodyArgs = NatalArgs.extend({
  analysis_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
type BodyPayload = z.infer<typeof BodyArgs>;

/* ── helpers ───────────────────────────────────────────────────── */
const PHASE_NAMES = ["New", "First-Quarter", "Full", "Last-Quarter"];

function nearestPhase(phases: string[], targetISO: string) {
  const t = Date.parse(targetISO);
  return phases
    .map(p => ({ p, d: Math.abs(Date.parse(p) - t) }))
    .sort((a, b) => a.d - b.d)[0].p;
}

function planetHour(date: Date, lat: number, lon: number) {
  /* Rough sunrise/sunset calc (civil) for planetary hours.           *
   * Uses simple solar decl formula for speed – good to ±5 min.       */
  const rad = Math.PI / 180;
  const n = Math.floor((date.valueOf() / 864e5) + 0.0008); // JD-ish
  const lngHour = lon / 15;
  const t = (n - lngHour) / 36525;
  const M = (357.52911 + t * (35999.05029 - 0.0001537 * t)) * rad;
  const L = (280.46646 + t * 36000.76983 + 0.0003032 * t) * rad
            + 1.914602 * rad * Math.sin(M);
  const decl = Math.asin(Math.sin(L) * Math.sin(23.4393 * rad));
  const ha = Math.acos(
    (Math.cos(90.833 * rad) /
     (Math.cos(lat * rad) * Math.cos(decl))) - Math.tan(lat * rad) * Math.tan(decl)
  ) / rad;          // in degrees
  const sunriseUTC = (720 - 4 * (lon + ha)) * 60 * 1000; // ms after midnight
  const sunsetUTC  = (720 - 4 * (lon - ha)) * 60 * 1000;
  const dayLen = (sunsetUTC - sunriseUTC) / 12;
  const nightLen = (864e5 - (sunsetUTC - sunriseUTC)) / 12;
  const utcMs = (date.getUTCHours()*3600 + date.getUTCMinutes()*60 + date.getUTCSeconds()) * 1000;

  const isDay = utcMs >= sunriseUTC && utcMs < sunsetUTC;
  const seg   = isDay
      ? Math.floor((utcMs - sunriseUTC) / dayLen)
      : Math.floor((utcMs < sunriseUTC
            ? utcMs + 864e5 - sunriseUTC
            : utcMs - sunsetUTC) / nightLen);

  // Day ruler order: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn
  const rulers = [0,1,3,4,2,5,6];               // planetary order indices
  const weekday = date.getUTCDay();              // 0=Sun…6=Sat
  const dayRuler = rulers[weekday];
  const sequence = [dayRuler, 1, 6, 4, 3, 2, 5]; // fill 7→0 cycle
  const hourRuler = sequence[(seg) % 7];

  const name = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  return { day_ruler: name[dayRuler], hour_ruler: name[hourRuler] };
}

function circadianTag(local: Date) {
  const h = local.getHours();
  if (h >= 5 && h < 10)  return "Surge (AM)";
  if (h >= 10 && h < 15) return "Clarity (Midday)";
  if (h >= 15 && h < 19) return "Dip (PM)";
  return "Rest Window";
}

/* ── HTTP handler ──────────────────────────────────────────────── */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing body matrix request");
    const args: BodyPayload = BodyArgs.parse(await req.json());

    /* --- step 1 : natal chart ----------------------------------- */
    console.log("Step 1: Requesting natal chart data");
    const swissNatal = toSwissNatal(args);
    const natR = await fetch(`${SWISS}/natal`, {
      method: "POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(swissNatal),
    });
    if (!natR.ok) {
      console.error("Error fetching natal data:", await natR.text());
      throw new Error(`Swiss API natal returned ${natR.status}`);
    }
    const natal = await natR.json();

    /* --- step 2 : date context ---------------------------------- */
    console.log("Step 2: Requesting transit data");
    const targetDate = args.analysis_date ?? new Date().toISOString().slice(0,10);
    const transBody  = { ...swissNatal, transit_date: targetDate };
    const transR = await fetch(`${SWISS}/transits`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(transBody),
    });
    if (!transR.ok) {
      console.error("Error fetching transit data:", await transR.text());
      throw new Error(`Swiss API transits returned ${transR.status}`);
    }
    const trans = await transR.json();

    /* --- step 3 : lunar phase ----------------------------------- */
    console.log("Step 3: Determining lunar phase");
    const year = targetDate.slice(0,4);
    const mpR = await fetch(`${SWISS}/moonphases?year=${year}`);
    if (!mpR.ok) {
      console.error("Error fetching moon phases:", await mpR.text());
      throw new Error(`Swiss API moonphases returned ${mpR.status}`);
    }
    const phasesISO: string[] = (await mpR.json()).phases_utc;
    const phaseISO = nearestPhase(phasesISO, `${targetDate}T00:00:00Z`);
    const phaseName = PHASE_NAMES[
      phasesISO.indexOf(phaseISO) % 4
    ];

    /* --- step 4 : pick relevant aspects ------------------------- */
    console.log("Step 4: Filtering relevant aspects");
    const bodyAspects = trans.aspects_to_natal.filter((a: any) => {
      const moonA = a.a === "Moon";
      const moonB = a.b === "Moon";
      const marsA = a.a === "Mars";
      const marsB = a.b === "Mars";
      const asc   = a.b === "ASC" || a.a === "ASC";
      return (moonA || moonB || marsA || marsB || asc);
    });

    /* --- step 5 : planetary hour & circadian -------------------- */
    console.log("Step 5: Calculating planetary hour and circadian window");
    const tzName = natal.meta.tz;
    // We're directly using the timezone from natal chart data
    const locISO = `${targetDate}T${args.birth_time}:00`;
    const localDate = new Date(
      new Date(locISO).toLocaleString("en-US", { timeZone: tzName })
    );
    const hourData = planetHour(localDate, args.latitude, args.longitude);
    const circadian = circadianTag(localDate);

    /* --- response ---------------------------------------------- */
    console.log("Preparing response");
    const response = {
      date: targetDate,
      phase: phaseName,
      natal_moon_sign: natal.planets.Moon.sign,
      body_aspects: bodyAspects,
      mars_transit: bodyAspects.filter((x:any)=>x.a==="Mars"||x.b==="Mars"),
      lunar_transit: bodyAspects.filter((x:any)=>x.a==="Moon"||x.b==="Moon"),
      planetary_rulers: hourData,
      circadian_window: circadian,
    };
    
    console.log("Successfully processed body matrix request");
    
    return new Response(JSON.stringify(response), { 
      headers: { ...corsHeaders, "Content-Type":"application/json" }
    });

  } catch (err) {
    console.error("Error processing body matrix request:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
