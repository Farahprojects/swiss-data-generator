import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

// Minimal CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Env + debug
const LOG_LEVEL = Deno.env.get("LOG_LEVEL") ?? "info";
const debug = (...a: unknown[]) => (LOG_LEVEL === "debug" ? console.log(...a) : void 0);

// Schemas (compact)
const PersonSchema = z.object({
  name: z.string().min(1, "name required").optional(),
  // Optional astro fields if present; we keep them permissive
  birth_date: z.string().optional(),
  birth_time: z.string().optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const PlanetSchema = z.object({
  name: z.string(),
  lon: z.number().optional(),
  lat: z.number().optional(),
  speed: z.number().optional(),
}).passthrough();

const ChartDataSchema = z.object({
  planets: z.array(PlanetSchema).optional(),
  houses: z.any().optional(),
  aspects: z.any().optional(),
}).passthrough();

const InputSchema = z.object({
  // Core fields used by engines
  endpoint: z.string().min(1),
  report_type: z.string().min(1),
  chartData: ChartDataSchema.optional(),

  // Request/category hints (essence/sync)
  request: z.string().optional(),

  // Identity variants we see across flows
  person_a: PersonSchema.optional(),
  person_b: PersonSchema.optional(),
  name: z.string().optional(),
  secondPersonName: z.string().optional(),

  // Pass-through flags
  is_guest: z.boolean().optional(),
  user_id: z.string().optional(),
}).passthrough();

// Helpers
function resolveNames(input: z.infer<typeof InputSchema>) {
  const personAName = input.person_a?.name || input.name || null;
  const personBName = input.person_b?.name || input.secondPersonName || null;
  return { personAName, personBName };
}

function buildAiPayload(input: z.infer<typeof InputSchema>) {
  const { personAName, personBName } = resolveNames(input);

  // Keep payload lean; include minimal person objects if present
  const payload: Record<string, unknown> = {
    chartData: input.chartData,
    endpoint: input.endpoint,
    report_type: input.report_type,
    person_a_name: personAName,
    person_b_name: personBName,
  };

  if (input.person_a?.name) payload.person_a = { name: input.person_a.name };
  if (input.person_b?.name) payload.person_b = { name: input.person_b.name };

  return payload;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const raw = await req.json().catch(() => null);
    if (!raw) return json(400, { error: "Invalid JSON body" });

    const parsed = InputSchema.safeParse(raw);
    if (!parsed.success) {
      return json(400, { error: "Validation failed", details: parsed.error.flatten() });
    }

    const input = parsed.data;
    debug("[report-prep] Received input:", {
      endpoint: input.endpoint,
      report_type: input.report_type,
      hasPersonA: Boolean(input.person_a?.name || input.name),
      hasPersonB: Boolean(input.person_b?.name || input.secondPersonName),
    });

    const aiPayload = buildAiPayload(input);
    debug("[report-prep] AI payload:", aiPayload);

    return json(200, { success: true, ai_payload: aiPayload });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return json(500, { error: message });
  }
}); 