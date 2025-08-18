// Sync UI normalization - converts nested Sync payload to flat SubjectVM structure
// Enables reusing single-person components for both people in a relationship

type Angles = Record<string, { deg?: number; sign?: string }>;
type Houses = Record<string, { deg?: number; sign?: string }>;
type Planets = Record<string, { deg?: number; sign?: string; house?: number; house_natal?: number; retrograde?: boolean }>;

type NatalBlock = { 
  angles?: Angles; 
  houses?: Houses; 
  planets?: Planets; 
  aspects?: any[]; 
  meta?: { tz?: string } 
};

type TransitBlock = { 
  angles?: Angles; 
  houses?: Houses; 
  planets?: Planets; 
  aspects_to_natal?: any[]; 
  requested_local_time?: string; 
  datetime_utc?: string; 
  timezone?: string 
};

type PersonKey = "person_a" | "person_b";

export type SubjectVM = {
  key: PersonKey;
  name: string;
  natal: NatalBlock;
  transits?: TransitBlock;
  tzDisplay?: string;        // prefer transits.timezone, else natal.meta.tz
};

export type SyncVM = {
  analysisDate: string;      // meta.date + meta.time
  timeBasis?: string;        // meta.time_basis
  subjects: SubjectVM[];     // one or two subjects
  synastryPairs?: any[];     // payload.synastry_aspects.pairs
  compositePlanets?: Record<string, { deg?: number; sign?: string }>;
};

export function normalizeSync(payload: any): SyncVM {
  console.log('[normalizeSync] Debug payload structure:', {
    hasNatal: !!payload?.natal,
    hasNatalSubjects: !!payload?.natal?.subjects,
    hasTransits: !!payload?.transits,
    natalKeys: Object.keys(payload?.natal?.subjects || {}),
    transitKeys: Object.keys(payload?.transits || {})
  });
  
  const meta = payload?.meta ?? {};
  const analysisDate = [meta.date, meta.time].filter(Boolean).join(" ");
  const timeBasis = meta.time_basis;

  const natalSubjects = payload?.natal?.subjects ?? {};
  const trans = payload?.transits ?? {};

  const makeSubject = (key: PersonKey): SubjectVM | null => {
    const natal = natalSubjects?.[key] ?? {};
    const transits = trans?.[key];
    
    console.log(`[normalizeSync] Processing ${key}:`, {
      hasNatal: !!natal,
      hasTransits: !!transits,
      natalName: natal?.name,
      transitsName: transits?.name,
      natalHasAngles: !!natal?.angles,
      natalHasPlanets: !!natal?.planets,
      transitsHasPlanets: !!transits?.planets,
      transitsHasAspects: !!transits?.aspects_to_natal
    });
    
    if (!natal && !transits) {
      console.log(`[normalizeSync] Skipping ${key} - no data`);
      return null;
    }

    const name =
      natal?.name ??
      transits?.name ??
      (key === "person_a" ? "Person A" : "Person B");

    const tzDisplay =
      (transits?.timezone && transits.timezone !== 'UTC') 
        ? transits.timezone 
        : natal?.meta?.tz || undefined;

    console.log(`[normalizeSync] Created subject ${key}:`, { name, tzDisplay });

    return { 
      key, 
      name, 
      natal: natal || {}, 
      transits, 
      tzDisplay 
    };
  };

  const subjects = (["person_a", "person_b"] as PersonKey[])
    .map(makeSubject)
    .filter(Boolean) as SubjectVM[];

  return {
    analysisDate,
    timeBasis,
    subjects,
    synastryPairs: payload?.synastry_aspects?.pairs ?? [],
    compositePlanets: payload?.composite_chart?.planets ?? {},
  };
}
