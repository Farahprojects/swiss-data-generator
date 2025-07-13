// supabase/functions/_shared/swissDataProcessor.ts
//
// Helper to inject real names into Swiss ephemeris data
// Replaces "Person A" and "Person B" placeholders with actual names
// throughout the entire Swiss data JSON structure

/**
 * Recursively processes Swiss data to replace Person A/B placeholders with real names
 * @param swiss - The Swiss ephemeris data object
 * @param personA - Real name for Person A
 * @param personB - Real name for Person B (optional for single person reports)
 * @returns Processed Swiss data with real names embedded
 */
export function injectRealNames(
  swiss: any,
  personA: string,
  personB?: string
): typeof swiss {
  console.log('[swissDataProcessor] [INJECT] Starting injectRealNames with:', { personA, personB });
  
  if (!swiss || !personA) {
    console.warn('[swissDataProcessor] [INJECT] Invalid input - swiss:', !!swiss, 'personA:', !!personA);
    return swiss;
  }

  // Size guard: skip processing if JSON too large (> 2MB)
  try {
    const jsonSize = JSON.stringify(swiss).length;
    console.log('[swissDataProcessor] [INJECT] Swiss data size:', jsonSize, 'characters');
    
    if (jsonSize > 2 * 1024 * 1024) {
      console.warn(`[swissDataProcessor] [INJECT] Skipping large payload: ${(jsonSize / 1024 / 1024).toFixed(2)}MB`);
      return swiss;
    }
  } catch (err) {
    console.error('[swissDataProcessor] [INJECT] Failed to measure JSON size:', err);
    return swiss;
  }

  let replacementCount = 0;
  
  const replace = (val: any): any => {
    // Handle strings - replace placeholders with real names using word boundaries
    if (typeof val === 'string') {
      const original = val;
      let result = val
        .replace(/\bPerson\s*A\b/gi, (match) => {
          console.log('[swissDataProcessor] [INJECT] Replacing Person A:', match, '→', personA);
          replacementCount++;
          return personA;
        })
        .replace(/\bPerson\s*B\b/gi, (match) => {
          console.log('[swissDataProcessor] [INJECT] Replacing Person B:', match, '→', personB || '');
          replacementCount++;
          return personB || '';
        });
      
      // Clean up any double spaces or trailing spaces from empty Person B replacements
      result = result.replace(/\s+/g, ' ').trim();
      
      // Log significant changes
      if (original !== result) {
        console.log('[swissDataProcessor] [INJECT] String transformation:', { original: original.substring(0, 100), result: result.substring(0, 100) });
      }
      
      return result;
    }
    
    // Handle arrays - recursively process each element
    if (Array.isArray(val)) {
      return val.map(replace);
    }
    
    // Handle objects - recursively process each property
    if (val && typeof val === 'object') {
      return Object.fromEntries(
        Object.entries(val).map(([k, v]) => [k, replace(v)])
      );
    }
    
    // Return primitive values unchanged
    return val;
  };

  const result = replace(swiss) as typeof swiss;
  console.log('[swissDataProcessor] [INJECT] Total replacements made:', replacementCount);
  
  return result;
}

/**
 * Extracts person names from request data (same logic as mapReportPayload)
 * @param requestData - Original request data containing person information
 * @returns Object with personA and personB names
 */
/**
 * Detects if Swiss data represents synastry (two-person) report
 * @param raw - The Swiss ephemeris data object
 * @returns True if the data contains synastry indicators
 */
export function isSynastryData(raw: any): boolean {
  if (!raw) return false;

  return !!(
    raw.transits?.person_a ||
    raw.transits?.person_b ||
    raw.person_a ||
    raw.person_b ||
    raw.synastry_aspects ||
    raw.composite_chart
  );
}

/**
 * Enriches Swiss data with structured name fields (like frontend does)
 * @param swiss - The Swiss ephemeris data object
 * @param personA - Real name for Person A
 * @param personB - Real name for Person B (optional for single person reports)
 * @returns Swiss data with structured name fields added
 */
export function enrichSwissDataWithNames(
  swiss: any,
  personA: string,
  personB?: string
): typeof swiss {
  console.log('[swissDataProcessor] [ENRICH] Starting enrichSwissDataWithNames with:', { personA, personB });
  
  if (!swiss || !personA) {
    console.warn('[swissDataProcessor] [ENRICH] Invalid input - swiss:', !!swiss, 'personA:', !!personA);
    return swiss;
  }

  // Clone the data to avoid mutation
  const enriched = structuredClone(swiss);
  
  // Check if this is synastry data
  const isSynastry = isSynastryData(swiss);
  console.log('[swissDataProcessor] [ENRICH] Detected synastry data:', isSynastry);

  // Add structured name fields like the frontend does
  if (isSynastry && personB) {
    // For synastry: add chartData.person_a_name and chartData.person_b_name
    if (!enriched.chartData) {
      enriched.chartData = {};
    }
    enriched.chartData.person_a_name = personA;
    enriched.chartData.person_b_name = personB;
    console.log('[swissDataProcessor] [ENRICH] Added synastry name fields:', { 
      person_a_name: personA, 
      person_b_name: personB 
    });
  } else {
    // For single person: add appropriate name field
    if (!enriched.chartData) {
      enriched.chartData = {};
    }
    enriched.chartData.person_name = personA;
    console.log('[swissDataProcessor] [ENRICH] Added single person name field:', { person_name: personA });
  }

  // Run string replacement as fallback for any remaining placeholders
  const finalEnriched = injectRealNames(enriched, personA, personB);
  
  console.log('[swissDataProcessor] [ENRICH] ✅ Successfully enriched Swiss data with structured names');
  return finalEnriched;
}

export function extractPersonNames(requestData: any): { personA: string; personB?: string } {
  console.log('[swissDataProcessor] [EXTRACT] Extracting person names from request data...');
  console.log('[swissDataProcessor] [EXTRACT] Request data keys:', Object.keys(requestData || {}));
  
  const personA = requestData.person_a?.name ?? 
                  requestData.report_data?.name ?? // guest flow fallback
                  requestData.name ?? 
                  'Person A';
  
  const personB = requestData.person_b?.name ?? 
                  requestData.secondPersonName ?? 
                  undefined;

  console.log('[swissDataProcessor] [EXTRACT] Extracted names result:', { personA, personB });
  console.log('[swissDataProcessor] [EXTRACT] Name sources used:', {
    personA_source: requestData.person_a?.name ? 'person_a.name' : 
                   requestData.report_data?.name ? 'report_data.name' :
                   requestData.name ? 'name' : 'fallback',
    personB_source: requestData.person_b?.name ? 'person_b.name' :
                   requestData.secondPersonName ? 'secondPersonName' : 'none'
  });

  return { personA, personB };
}
