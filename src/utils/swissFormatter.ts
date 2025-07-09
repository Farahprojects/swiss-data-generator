// swissFormatter.ts  – Data-only formatter
// -------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface EnrichedPlanet {
  name: string;           // "Sun"
  sign: string;           // "Cancer"
  signGlyph: string;      // "♋︎"
  deg: number;            // 16
  min: number;            // 19
  retro: boolean;         // true | false
}

export interface EnrichedAspect {
  a: string;              // "Sun"
  b: string;              // "Pluto"
  type: string;           // "Square"
  orbDeg: number;         // 5
  orbMin: number;         // 26
}

export interface EnrichedSnapshot {
  dateISO: string;        // "2025-07-08"
  timeISO: string;        // "12:00:00"
  tz: string;             // "Australia/Melbourne"
  planets: EnrichedPlanet[];
  aspects: EnrichedAspect[];
}

const ZODIAC_SIGNS = [
  'Aries','Taurus','Gemini','Cancer',
  'Leo','Virgo','Libra','Scorpio',
  'Sagittarius','Capricorn','Aquarius','Pisces'
];

const ZODIAC_GLYPHS = [
  '♈︎','♉︎','♊︎','♋︎',
  '♌︎','♍︎','♎︎','♏︎',
  '♐︎','♑︎','♒︎','♓︎'
];

const PLANET_NAMES: Record<string,string> = {
  sun:'Sun', moon:'Moon', mercury:'Mercury', venus:'Venus',
  mars:'Mars', jupiter:'Jupiter', saturn:'Saturn',
  uranus:'Uranus', neptune:'Neptune', pluto:'Pluto',
  chiron:'Chiron', northnode:'North Node', southnode:'South Node'
};

export const degreesToSign = (lon: number) => {
  const norm = ((lon % 360) + 360) % 360;
  const signIdx = Math.floor(norm / 30);
  const deg = Math.floor(norm % 30);
  const min = Math.round(((norm % 30) - deg) * 60);
  return { sign: ZODIAC_SIGNS[signIdx], glyph: ZODIAC_GLYPHS[signIdx], deg, min };
};

export const parseSwissDataRich = (raw: any): EnrichedSnapshot => {
  const natal = raw.natal ?? raw;            // support {natal:{…}} or flat
  const meta  = natal.meta ?? {};

  // --- Date & time ---------------------------------------------
  const dateISO = meta.utc ? new Date(meta.utc).toISOString().slice(0,10) : meta.date;
  const timeISO = meta.utc ? new Date(meta.utc).toISOString().slice(11,19) : meta.time;
  const tz      = meta.tz ?? 'UTC';

  // --- Planets --------------------------------------------------
  const planets: EnrichedPlanet[] = Array.isArray(natal.planets) 
    ? natal.planets.map((p:any) => {
        const { sign, glyph, deg, min } = degreesToSign(p.longitude);
        return {
          name : PLANET_NAMES[p.planet?.toLowerCase()] ?? p.planet,
          sign, signGlyph: glyph,
          deg, min,
          retro : !!p.retrograde
        };
      })
    : [];

  // --- Aspects --------------------------------------------------
  const aspects: EnrichedAspect[] = Array.isArray(natal.aspects) 
    ? natal.aspects.map((a:any) => {
        const orbDeg = Math.floor(a.orb);
        const orbMin = Math.round((a.orb - orbDeg) * 60);
        return {
          a : PLANET_NAMES[a.a?.toLowerCase()] ?? a.a,
          b : PLANET_NAMES[a.b?.toLowerCase()] ?? a.b,
          type : a.type,
          orbDeg,
          orbMin
        };
      })
    : [];

  return { dateISO, timeISO, tz, planets, aspects };
};