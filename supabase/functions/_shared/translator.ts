
// Shared helpers for every Swiss translator
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/* ----- Swiss-Ephemeris house-code map ----- */
export const HOUSE_MAP = {
  "placidus":   "P",
  "koch":       "K",
  "whole-sign": "W",
  "equal":      "A",
} as const;

/* ----- Friendly args the AI / FE will send ----- */
export const NatalArgs = z.object({
  birth_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birth_time:   z.string().regex(/^\d{2}:\d{2}$/).default("12:00"),
  latitude:     z.number().min(-90).max(90),
  longitude:    z.number().min(-180).max(180),
  system:       z.enum(["western", "vedic"]).default("western"),
  house_system: z.enum(["placidus","koch","whole-sign","equal"]).default("placidus"),
});
export type NatalPayload = z.infer<typeof NatalArgs>;

/* ----- Convert to Swiss-API payload ----- */
export function toSwissNatal(p: NatalPayload) {
  return {
    birth_date: p.birth_date,
    birth_time: p.birth_time,
    lat:        p.latitude,
    lon:        p.longitude,
    sidereal:   p.system === "vedic",
    settings:   { house_system: HOUSE_MAP[p.house_system] },
  };
}
