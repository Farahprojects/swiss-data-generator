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
  house?: number;         // 10 (which house the planet is in)
}

export interface EnrichedAspect {
  a: string;              // "Sun"
  b: string;              // "Pluto"
  type: string;           // "Square"
  orbDeg: number;         // 5
  orbMin: number;         // 26
}

export interface EnrichedHouse {
  number: number;         // 1, 2, 3, ... 12
  deg: number;            // 27
  min: number;            // 45
  sign: string;           // "Libra"
  signGlyph: string;      // "♎︎"
}

export interface EnrichedAngle {
  name: string;           // "ASC", "DSC", "MC", "IC"
  deg: number;            // 27
  min: number;            // 45
  sign: string;           // "Libra"
  signGlyph: string;      // "♎︎"
}

export interface EnrichedTransitPlanet {
  name: string;           // "Sun"
  sign: string;           // "Cancer"
  signGlyph: string;      // "♋︎"
  deg: number;            // 21
  min: number;            // 48
  retro: boolean;         // true | false
}

export interface EnrichedTransitAspect {
  transitPlanet: string;  // "Sun" (transit)
  natalPlanet: string;    // "Mars" (natal)
  type: string;           // "Sextile"
  orbDeg: number;         // 6
  orbMin: number;         // 35
}

export interface EnrichedSnapshot {
  dateISO: string;        // "2025-07-08"
  timeISO: string;        // "12:00:00"
  tz: string;             // "Australia/Melbourne"
  name?: string;          // Person's name
  meta?: {                // Birth location and coordinates
    location?: string;
    lat?: number;
    lon?: number;
    tz?: string;
    error?: string;     // For error reporting
  };
  planets: EnrichedPlanet[];
  aspects: EnrichedAspect[];
  houses: EnrichedHouse[];
  angles: EnrichedAngle[];
  transits?: {
    planets: EnrichedTransitPlanet[];
    aspects: EnrichedTransitAspect[];
    datetime?: string;    // Transit calculation time
  };
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

// Helper function to extract planets from Swiss data structure
const extractPlanetsFromSwiss = (swissData: any): EnrichedPlanet[] => {
  if (!swissData?.natal?.planets) return [];
  
  const planets: EnrichedPlanet[] = [];
  const planetData = swissData.natal.planets;
  
  Object.keys(planetData).forEach(planetKey => {
    const p = planetData[planetKey];
    if (p && typeof p.deg === 'number' && p.sign) {
      const planetName = PLANET_NAMES[planetKey.toLowerCase()] || planetKey;
      planets.push({
        name: planetName,
        sign: p.sign,
        signGlyph: ZODIAC_GLYPHS[ZODIAC_SIGNS.indexOf(p.sign)] || '?',
        deg: Math.floor(p.deg),
        min: Math.round((p.deg - Math.floor(p.deg)) * 60),
        retro: !!p.retrograde,
        house: p.house || undefined
      });
    }
  });
  
  return planets;
};

// Helper function to extract house cusps from Swiss data structure
const extractHousesFromSwiss = (swissData: any): EnrichedHouse[] => {
  if (!swissData?.natal?.houses) return [];
  
  const houses: EnrichedHouse[] = [];
  const houseData = swissData.natal.houses;
  
  Object.keys(houseData).forEach(houseKey => {
    const h = houseData[houseKey];
    const houseNumber = parseInt(houseKey);
    if (h && typeof h.deg === 'number' && h.sign && !isNaN(houseNumber)) {
      houses.push({
        number: houseNumber,
        deg: Math.floor(h.deg),
        min: Math.round((h.deg - Math.floor(h.deg)) * 60),
        sign: h.sign,
        signGlyph: ZODIAC_GLYPHS[ZODIAC_SIGNS.indexOf(h.sign)] || '?'
      });
    }
  });
  
  // Sort by house number
  return houses.sort((a, b) => a.number - b.number);
};

// Helper function to extract chart angles from Swiss data structure
const extractAnglesFromSwiss = (swissData: any): EnrichedAngle[] => {
  if (!swissData?.natal?.angles) return [];
  
  const angles: EnrichedAngle[] = [];
  const angleData = swissData.natal.angles;
  
  const angleOrder = ['ASC', 'DSC', 'MC', 'IC'];
  angleOrder.forEach(angleName => {
    const a = angleData[angleName];
    if (a && typeof a.deg === 'number' && a.sign) {
      angles.push({
        name: angleName,
        deg: Math.floor(a.deg),
        min: Math.round((a.deg - Math.floor(a.deg)) * 60),
        sign: a.sign,
        signGlyph: ZODIAC_GLYPHS[ZODIAC_SIGNS.indexOf(a.sign)] || '?'
      });
    }
  });
  
  return angles;
};

// Helper function to extract transit planets from Swiss data structure
const extractTransitPlanetsFromSwiss = (swissData: any): EnrichedTransitPlanet[] => {
  if (!swissData?.transits?.planets) return [];
  
  const planets: EnrichedTransitPlanet[] = [];
  const planetData = swissData.transits.planets;
  
  Object.keys(planetData).forEach(planetKey => {
    const p = planetData[planetKey];
    if (p && typeof p.deg === 'number' && p.sign) {
      const planetName = PLANET_NAMES[planetKey.toLowerCase()] || planetKey;
      planets.push({
        name: planetName,
        sign: p.sign,
        signGlyph: ZODIAC_GLYPHS[ZODIAC_SIGNS.indexOf(p.sign)] || '?',
        deg: Math.floor(p.deg),
        min: Math.round((p.deg - Math.floor(p.deg)) * 60),
        retro: !!p.retrograde
      });
    }
  });
  
  return planets;
};

// Helper function to extract transit aspects from Swiss data structure
const extractTransitAspectsFromSwiss = (swissData: any): EnrichedTransitAspect[] => {
  if (!swissData?.transits?.aspects_to_natal) return [];
  
  const aspects: EnrichedTransitAspect[] = [];
  const aspectsArray = swissData.transits.aspects_to_natal;
  
  aspectsArray.forEach((a: any) => {
    if (a && a.a && a.b && a.type && typeof a.orb === 'number') {
      const orbDeg = Math.floor(a.orb);
      const orbMin = Math.round((a.orb - orbDeg) * 60);
      aspects.push({
        transitPlanet: PLANET_NAMES[a.a.toLowerCase()] || a.a,
        natalPlanet: PLANET_NAMES[a.b.toLowerCase()] || a.b,
        type: a.type,
        orbDeg,
        orbMin
      });
    }
  });
  
  return aspects;
};

// Helper function to extract aspects from Swiss data structure
const extractAspectsFromSwiss = (swissData: any): EnrichedAspect[] => {
  if (!swissData?.natal?.aspects && !swissData?.transits?.aspects_to_natal) return [];
  
  const aspects: EnrichedAspect[] = [];
  
  // Try natal aspects first
  let aspectsArray = swissData.natal?.aspects || swissData.transits?.aspects_to_natal || [];
  
  aspectsArray.forEach((a: any) => {
    if (a && a.a && a.b && a.type && typeof a.orb === 'number') {
      const orbDeg = Math.floor(a.orb);
      const orbMin = Math.round((a.orb - orbDeg) * 60);
      aspects.push({
        a: PLANET_NAMES[a.a.toLowerCase()] || a.a,
        b: PLANET_NAMES[a.b.toLowerCase()] || a.b,
        type: a.type,
        orbDeg,
        orbMin
      });
    }
  });
  
  return aspects;
};

// Helper function to debug Swiss data structure
const debugSwissStructure = (raw: any): void => {
  console.log('🔍 Swiss Data Debug:', {
    hasRaw: !!raw,
    hasNatal: !!raw?.natal,
    hasTransits: !!raw?.transits,
    natalKeys: raw?.natal ? Object.keys(raw.natal) : [],
    transitKeys: raw?.transits ? Object.keys(raw.transits) : [],
    planetCount: raw?.natal?.planets ? Object.keys(raw.natal.planets).length : 0,
    aspectCount: raw?.natal?.aspects ? raw.natal.aspects.length : 0
  });
};

export const parseSwissDataRich = (raw: any): EnrichedSnapshot => {
  // Add debugging for development
  if (process.env.NODE_ENV === 'development') {
    debugSwissStructure(raw);
  }

  // Return empty data structure if raw is null/undefined
  if (!raw) {
    console.warn('⚠️ parseSwissDataRich: No raw data provided');
    return {
      dateISO: new Date().toISOString().slice(0, 10),
      timeISO: '00:00:00',
      tz: 'UTC',
      name: 'Unknown',
      meta: {},
      planets: [],
      aspects: [],
      houses: [],
      angles: []
    };
  }

  try {
    // Handle nested Swiss data structure
    const swissData = raw.swiss_data || raw;
    const natal = swissData?.natal || swissData;
    const meta = natal?.meta || {};

    // --- Date & time ---------------------------------------------
    let dateISO: string;
    let timeISO: string;
    
    if (meta.utc) {
      const utcDate = new Date(meta.utc);
      dateISO = utcDate.toISOString().slice(0, 10);
      timeISO = utcDate.toISOString().slice(11, 19);
    } else {
      // Fallback to current date if no UTC available
      const now = new Date();
      dateISO = now.toISOString().slice(0, 10);
      timeISO = '00:00:00';
    }
    
    const tz = meta.tz || 'UTC';

    // --- Name and location data ----------------------------------
    const name = meta.name || natal.name || raw.name || 'Unknown';
    const metaInfo = {
      location: meta.location || natal.location,
      lat: meta.lat || natal.lat || natal.latitude,
      lon: meta.lon || natal.lon || natal.longitude,
      tz: tz
    };

    // --- Extract all data using helper functions ---
    const planets = extractPlanetsFromSwiss(swissData);
    const aspects = extractAspectsFromSwiss(swissData);
    const houses = extractHousesFromSwiss(swissData);
    const angles = extractAnglesFromSwiss(swissData);
    
    // Extract transit data if available
    const transitPlanets = extractTransitPlanetsFromSwiss(swissData);
    const transitAspects = extractTransitAspectsFromSwiss(swissData);
    const transitDateTime = swissData?.transits?.datetime_utc;
    
    const transits = (transitPlanets.length > 0 || transitAspects.length > 0) ? {
      planets: transitPlanets,
      aspects: transitAspects,
      datetime: transitDateTime
    } : undefined;

    console.log('✅ parseSwissDataRich: Successfully parsed', {
      planetCount: planets.length,
      aspectCount: aspects.length,
      houseCount: houses.length,
      angleCount: angles.length,
      transitPlanetCount: transitPlanets.length,
      transitAspectCount: transitAspects.length,
      hasLocation: !!metaInfo.location
    });

    return { 
      dateISO, 
      timeISO, 
      tz, 
      name, 
      meta: metaInfo, 
      planets, 
      aspects, 
      houses, 
      angles, 
      transits 
    };

  } catch (error) {
    console.error('❌ parseSwissDataRich: Error parsing Swiss data:', error);
    
    // Return minimal valid structure on error
    return {
      dateISO: new Date().toISOString().slice(0, 10),
      timeISO: '00:00:00',
      tz: 'UTC',
      name: 'Parse Error',
      meta: { error: 'Failed to parse Swiss data' },
      planets: [],
      aspects: [],
      houses: [],
      angles: []
    };
  }
};