import { serve } from "https://deno.land/std/http/server.ts";
import { z }     from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { NatalArgs, toSwissNatal } from "../_shared/translator.ts";

const SWISS_ROOT = "https://<project-ref>.functions.supabase.co";   // your other edge fns

/* ---------------- 1. schema w/ request keyword ----------------- */
const Base = z.object({
  request: z.string(),                // natal | transits | …
  system:  z.enum(["western","vedic"]).default("western").optional(),
  house:   z.enum(["placidus","koch","whole-sign","equal"]).optional(),
  sidereal: z.boolean().optional(),   // rarely needed by AI
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  birth_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),

  // extras
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  target_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  return_type: z.enum(["solar","lunar","saturn","jupiter"]).optional(),
  person_b: z.any().optional()        // validated later if request=relationship
});
type RequestBody = z.infer<typeof Base>;

/* --------------- 2.  synonym → canonical map ------------------- */
const CANONICAL: Record<string,string> = {
  natal: "natal",
  birth: "natal",
  "natal_chart":"natal",

  transits: "transits",
  transition:"transits",
  daily_transits:"transits",

  progressions: "progressions",
  progressed: "progressions",

  return: "return",
  solar_return: "return",
  lunar_return: "return",
  yearly_cycle: "return",

  relationship: "relationship",
  synastry: "relationship",
  compatibility: "relationship",
  composite: "relationship",

  body_matrix: "body_matrix",
  body: "body_matrix",
  biorhythm: "body_matrix",
};

/* --------------- 3. router logic -------------------------------- */
function endpointFor(req: string){
  const canon = CANONICAL[req.toLowerCase()];
  if(!canon) throw new Error(`Unknown request type "${req}"`);
  return canon;
}

serve( async (r) => {
  if (r.method === "OPTIONS") return new Response(null);

  try {
    const body:RequestBody = Base.parse(await r.json());
    const ep   = endpointFor(body.request);          // canonical

    /* --- build payloads --------------------------------------- */
    if (ep === "relationship") {
      if (!body.person_b) throw new Error("person_b is required");
      const a = toSwissNatal({ ...body, house_system: body.house ?? "placidus" });
      const b = toSwissNatal({ ...body.person_b, house_system: body.person_b.house ?? body.house ?? "placidus" });
      const resp = await fetch(`${SWISS_ROOT}/synastry`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ person_a:a, person_b:b })
      });
      return new Response(await resp.text(), { status: resp.status, headers:{ "Content-Type":"application/json" }});
    }

    // single-chart tasks ---------------------------------------
    const natalPayload = toSwissNatal({ ...body, house_system: body.house ?? "placidus" });

    let edgeURL = "";
    let taskBody: any = natalPayload;

    switch (ep) {
      case "natal":
        edgeURL = `${SWISS_ROOT}/natal`;
        break;

      case "transits":
        edgeURL = `${SWISS_ROOT}/transits`;
        taskBody = { ...natalPayload,
          transit_date: body.target_date,
          transit_time: body.target_time
        };
        break;

      case "progressions":
        edgeURL = `${SWISS_ROOT}/progressions`;
        taskBody = { ...natalPayload, progressed_date: body.target_date };
        break;

      case "return":
        edgeURL = `${SWISS_ROOT}/return`;
        taskBody = { ...natalPayload,
          type: body.return_type ?? "solar",
          year: body.target_date?.slice(0,4)
        };
        break;

      case "body_matrix":
        edgeURL = `${SWISS_ROOT}/body_matrix`;
        taskBody = { ...natalPayload, analysis_date: body.target_date };
        break;

      default:
        throw new Error("Routing not implemented");
    }

    const resp = await fetch(edgeURL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(taskBody)
    });
    return new Response(await resp.text(), {
      status: resp.status,
      headers:{ "Content-Type":"application/json" }
    });

  } catch (err){
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers:{ "Content-Type":"application/json" }
    });
  }
});
