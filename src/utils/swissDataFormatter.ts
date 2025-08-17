// @DEPRECATED: REDUNDANT PARSER - Mark for deletion
// This file contains a legacy Swiss data parser.
// The unified and correct parser is now located in src/lib/astroFormatter.ts
// This entire file can be removed in a future cleanup.

// Swiss Astrological Data Formatter
// Modular formatting functions for astrological chart data

export interface PlanetPosition {
  planet: string;
  longitude: number;
  latitude?: number;
  distance?: number;
  speed?: number;
  sign?: string;
  degree?: number;
  minute?: number;
  second?: number;
  retrograde?: boolean;
}

export interface AspectData {
  planet1: string;
  planet2: string;
  aspect: string;
  orb: number;
  applying?: boolean;
}

export interface BirthInformation {
  date?: string;
  time?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

interface HouseData {
  house: number;
  longitude: number;
  sign?: string;
  degree?: number;
  minute?: number;
}

export interface ParsedSwissData {
  birthInfo: BirthInformation;
  planets: PlanetPosition[];
  aspects: AspectData[];
  houses: HouseData[];
  rawData?: any;
}

interface SwissChartData {
  date?: string;
  time?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  planets?: PlanetPosition[];
  aspects?: AspectData[];
  houses?: any[];
  [key: string]: any;
}

// Zodiac signs mapping
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 
  'Leo', 'Virgo', 'Libra', 'Scorpio', 
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

// Planet names mapping
export const PLANET_NAMES: { [key: string]: string } = {
  'sun': 'Sun',
  'moon': 'Moon',
  'mercury': 'Mercury',
  'venus': 'Venus',
  'mars': 'Mars',
  'jupiter': 'Jupiter',
  'saturn': 'Saturn',
  'uranus': 'Uranus',
  'neptune': 'Neptune',
  'pluto': 'Pluto',
  'northnode': 'North Node',
  'southnode': 'South Node',
  'chiron': 'Chiron',
  'lilith': 'Lilith'
};

// Aspect names mapping
export const ASPECT_NAMES: { [key: string]: string } = {
  'conjunction': 'Conjunction',
  'opposition': 'Opposition',
  'trine': 'Trine',
  'square': 'Square',
  'sextile': 'Sextile',
  'quincunx': 'Quincunx',
  'semisextile': 'Semi-sextile',
  'semisquare': 'Semi-square',
  'sesquisquare': 'Sesquisquare'
};

/**
 * Convert decimal degrees to zodiac sign and degree
 */
export const degreesToZodiac = (longitude: number): { sign: string; degree: number; minute: number } => {
  const normalizedLong = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalizedLong / 30);
  const degreeInSign = normalizedLong % 30;
  const degree = Math.floor(degreeInSign);
  const minute = Math.floor((degreeInSign - degree) * 60);
  
  return {
    sign: ZODIAC_SIGNS[signIndex] || 'Unknown',
    degree,
    minute
  };
};

/**
 * Format planetary positions for display
 */
export const formatPlanetaryPositions = (planets: PlanetPosition[]): string => {
  if (!planets || planets.length === 0) return 'No planetary data available';
  
  let output = 'CURRENT PLANETARY POSITIONS\n\n';
  
  planets.forEach(planet => {
    const planetName = PLANET_NAMES[planet.planet.toLowerCase()] || planet.planet;
    
    if (typeof planet.longitude === 'number') {
      const zodiac = degreesToZodiac(planet.longitude);
      const retrograde = planet.retrograde ? ' (R)' : '';
      output += `${planetName}: ${zodiac.degree}°${zodiac.minute.toString().padStart(2, '0')}' ${zodiac.sign}${retrograde}\n`;
    } else {
      output += `${planetName}: Position data unavailable\n`;
    }
  });
  
  return output;
};

/**
 * Format aspects for display
 */
export const formatAspects = (aspects: AspectData[]): string => {
  if (!aspects || aspects.length === 0) return 'No aspect data available';
  
  let output = '\n\nASPECTS TO NATAL\n\n';
  
  aspects.forEach(aspect => {
    const planet1 = PLANET_NAMES[aspect.planet1?.toLowerCase()] || aspect.planet1;
    const planet2 = PLANET_NAMES[aspect.planet2?.toLowerCase()] || aspect.planet2;
    const aspectName = ASPECT_NAMES[aspect.aspect?.toLowerCase()] || aspect.aspect;
    const orb = typeof aspect.orb === 'number' ? aspect.orb.toFixed(2) : 'N/A';
    
    output += `${planet1} ${aspectName} ${planet2} (${orb}°)\n`;
  });
  
  return output;
};

/**
 * Format date and time information
 */
export const formatDateTimeInfo = (data: SwissChartData): string => {
  let output = 'DATE AND TIME\n\n';
  
  if (data.date) {
    output += `Date: ${data.date}\n`;
  }
  
  if (data.time) {
    output += `Time: ${data.time}\n`;
  }
  
  if (data.location) {
    output += `Location: ${data.location}\n`;
  }
  
  if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
    output += `Coordinates: ${data.latitude.toFixed(4)}°, ${data.longitude.toFixed(4)}°\n`;
  }
  
  if (data.timezone) {
    output += `Timezone: ${data.timezone}\n`;
  }
  
  return output;
};

/**
 * Parse raw Swiss data into structured format for modular rendering
 */
export const parseSwissData = (rawData: any): ParsedSwissData => {
  let chartData: SwissChartData = {};
  
  if (typeof rawData === 'string') {
    try {
      chartData = JSON.parse(rawData);
    } catch {
      // If not JSON, create minimal structure
      return {
        birthInfo: {},
        planets: [],
        aspects: [],
        houses: [],
        rawData: rawData
      };
    }
  } else {
    chartData = rawData || {};
  }

  // Handle nested structure (e.g., { natal: { meta: {...}, planets: [...] } })
  if (chartData.natal) {
    const natalData = chartData.natal;
    
    // Extract birth information from meta or root level
    const meta = natalData.meta || {};
    const birthInfo: BirthInformation = {
      date: meta.date || natalData.date || extractDateFromUTC(meta.utc),
      time: meta.time || natalData.time || extractTimeFromUTC(meta.utc),
      location: meta.location || natalData.location || `${meta.lat}, ${meta.lon}`,
      latitude: meta.lat || natalData.latitude,
      longitude: meta.lon || natalData.longitude,
      timezone: meta.tz || natalData.timezone
    };

    // Extract planetary positions - ensure it's an array
    const planets: PlanetPosition[] = Array.isArray(natalData.planets) 
      ? natalData.planets.map(planet => {
          if (typeof planet.longitude === 'number') {
            const zodiac = degreesToZodiac(planet.longitude);
            return {
              ...planet,
              sign: zodiac.sign,
              degree: zodiac.degree,
              minute: zodiac.minute
            };
          }
          return planet;
        })
      : [];

    // Extract aspects - ensure it's an array
    const aspects: AspectData[] = Array.isArray(natalData.aspects) ? natalData.aspects : [];

    // Extract houses - ensure it's an array
    const houses: HouseData[] = Array.isArray(natalData.houses) 
      ? natalData.houses.map((house, index) => {
          if (typeof house === 'number') {
            const zodiac = degreesToZodiac(house);
            return {
              house: index + 1,
              longitude: house,
              sign: zodiac.sign,
              degree: zodiac.degree,
              minute: zodiac.minute
            };
          }
          return house;
        })
      : [];

    return {
      birthInfo,
      planets,
      aspects,
      houses,
      rawData: chartData
    };
  }

  // Handle flat structure
  const birthInfo: BirthInformation = {
    date: chartData.date,
    time: chartData.time,
    location: chartData.location,
    latitude: chartData.latitude,
    longitude: chartData.longitude,
    timezone: chartData.timezone
  };

  // Extract and enhance planetary positions - ensure it's an array
  const planets: PlanetPosition[] = Array.isArray(chartData.planets)
    ? chartData.planets.map(planet => {
        if (typeof planet.longitude === 'number') {
          const zodiac = degreesToZodiac(planet.longitude);
          return {
            ...planet,
            sign: zodiac.sign,
            degree: zodiac.degree,
            minute: zodiac.minute
          };
        }
        return planet;
      })
    : [];

  // Extract aspects - ensure it's an array
  const aspects: AspectData[] = Array.isArray(chartData.aspects) ? chartData.aspects : [];

  // Extract houses - ensure it's an array
  const houses: HouseData[] = Array.isArray(chartData.houses) 
    ? chartData.houses.map((house, index) => {
        if (typeof house === 'number') {
          const zodiac = degreesToZodiac(house);
          return {
            house: index + 1,
            longitude: house,
            sign: zodiac.sign,
            degree: zodiac.degree,
            minute: zodiac.minute
          };
        }
        return house;
      })
    : [];

  return {
    birthInfo,
    planets,
    aspects,
    houses,
    rawData: chartData
  };
};

// Helper function to extract date from UTC string
const extractDateFromUTC = (utc?: string): string | undefined => {
  if (!utc) return undefined;
  try {
    const date = new Date(utc);
    return date.toISOString().split('T')[0];
  } catch {
    return undefined;
  }
};

// Helper function to extract time from UTC string
const extractTimeFromUTC = (utc?: string): string | undefined => {
  if (!utc) return undefined;
  try {
    const date = new Date(utc);
    return date.toTimeString().split(' ')[0];
  } catch {
    return undefined;
  }
};

/**
 * Main formatter function - formats complete Swiss astrological data
 */
export const formatSwissAstroData = (rawData: any): string => {
  try {
    if (!rawData) return 'No astrological data available';
    
    // Handle different data structures
    let chartData: SwissChartData = {};
    
    if (typeof rawData === 'string') {
      try {
        chartData = JSON.parse(rawData);
      } catch {
        return rawData; // Return as-is if it's not JSON
      }
    } else {
      chartData = rawData;
    }
    
    let formattedOutput = '';
    
    // Format date and time section
    formattedOutput += formatDateTimeInfo(chartData);
    
    // Format planetary positions
    if (chartData.planets) {
      formattedOutput += '\n' + formatPlanetaryPositions(chartData.planets);
    }
    
    // Format aspects
    if (chartData.aspects) {
      formattedOutput += formatAspects(chartData.aspects);
    }
    
    // If no structured data found, show raw data formatted nicely
    if (!chartData.planets && !chartData.aspects && !chartData.date) {
      formattedOutput = 'ASTROLOGICAL DATA\n\n';
      formattedOutput += JSON.stringify(chartData, null, 2);
    }
    
    return formattedOutput;
    
  } catch (error) {
    console.error('Error formatting Swiss astro data:', error);
    return `Error formatting astrological data: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

/**
 * Check if data contains valid astrological information
 */
export const hasValidAstroData = (data: any): boolean => {
  if (!data) return false;
  
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    return !!(parsed.planets || parsed.aspects || parsed.date || parsed.longitude);
  } catch {
    return typeof data === 'string' && data.length > 0;
  }
};