// lib/synastryFormatter.ts - Synastry data formatter
import { PLANET_NAMES, ASPECT_NAMES, degreesToSign } from './astroUtils';

export interface EnrichedPlanet {
  name: string;
  sign: string;
  glyph: string;
  deg: number;
  min: number;
  retro: boolean;
}

export interface EnrichedAspect {
  a: string;
  b: string;
  type: string;
  orbDeg: number;
  orbMin: number;
}

export interface PersonBlock {
  label: string;
  name?: string;
  planets: EnrichedPlanet[];
  aspectsToNatal: EnrichedAspect[];
}

export interface EnrichedSynastry {
  meta: {
    dateISO: string;
    time: string;
    lunarPhase?: string;
    personAName?: string;
    personBName?: string;
    tz?: string;
  };
  personA: PersonBlock;
  personB: PersonBlock;
  composite: EnrichedPlanet[];
  synastry: EnrichedAspect[];
}

// Helper to enrich planets from various formats
const enrichPlanets = (rawPlanets: any): EnrichedPlanet[] => {
  if (Array.isArray(rawPlanets)) {
    return rawPlanets.map(planet => {
      const { sign, glyph, deg, min } = degreesToSign(planet.longitude);
      return {
        name: PLANET_NAMES[planet.planet?.toLowerCase()] ?? planet.planet,
        sign,
        glyph,
        deg,
        min,
        retro: !!planet.retrograde
      };
    });
  }
  
  if (typeof rawPlanets === 'object' && rawPlanets !== null) {
    return Object.entries(rawPlanets).map(([key, val]: [string, any]) => {
      const longitude = val.deg ?? val.longitude ?? val;
      const { sign, glyph, deg, min } = degreesToSign(longitude);
      return {
        name: PLANET_NAMES[key.toLowerCase()] ?? key,
        sign,
        glyph,
        deg,
        min,
        retro: !!val.retrograde
      };
    });
  }
  
  return [];
};

// Helper to enrich aspects
const enrichAspects = (arr: any[]): EnrichedAspect[] =>
  (arr ?? []).map(a => {
    const orbDeg = Math.floor(a.orb ?? 0);
    const orbMin = Math.round(((a.orb ?? 0) - orbDeg) * 60);
    return {
      a: PLANET_NAMES[a.a?.toLowerCase()] ?? a.a,
      b: PLANET_NAMES[a.b?.toLowerCase()] ?? a.b,
      type: ASPECT_NAMES[a.type?.toLowerCase()] ?? a.type,
      orbDeg,
      orbMin
    };
  });

export const parseSynastryRich = (raw: any): EnrichedSynastry => {
  const meta = raw.meta ?? {};
  const transits = raw.transits ?? {};
  const pA = transits.person_a ?? raw.person_a ?? {};
  const pB = transits.person_b ?? raw.person_b ?? {};

  return {
    meta: {
      dateISO: meta.date ?? meta.utc?.split('T')[0] ?? new Date().toISOString().split('T')[0],
      time: meta.time ?? meta.utc?.split('T')[1]?.split('.')[0] ?? '12:00:00',
      lunarPhase: meta.lunar_phase,
      personAName: meta.personAName || raw.personAName,
      personBName: meta.personBName || raw.personBName,
      tz: meta.tz
    },
    personA: {
      label: 'Person A',
      name: meta.personAName || raw.personAName || raw.name,
      planets: enrichPlanets(pA.planets ?? {}),
      aspectsToNatal: enrichAspects(pA.aspects_to_natal ?? [])
    },
    personB: {
      label: 'Person B', 
      name: meta.personBName || raw.personBName || raw.secondPersonName,
      planets: enrichPlanets(pB.planets ?? {}),
      aspectsToNatal: enrichAspects(pB.aspects_to_natal ?? [])
    },
    composite: enrichPlanets(raw.composite_chart ?? {}),
    synastry: enrichAspects(raw.synastry_aspects ?? [])
  };
};

// Helper to detect if data is synastry/sync format
export const isSynastryData = (raw: any): boolean => {
  if (!raw) return false;
  
  // Check for typical synastry data patterns
  return !!(
    raw.transits?.person_a ||
    raw.transits?.person_b ||
    raw.person_a ||
    raw.person_b ||
    raw.synastry_aspects ||
    raw.composite_chart
  );
};