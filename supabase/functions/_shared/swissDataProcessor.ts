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
): any {
  if (!swiss || !personA) {
    return swiss;
  }

  const replace = (val: any): any => {
    // Handle strings - replace placeholders with real names
    if (typeof val === 'string') {
      let result = val
        .replace(/Person\s*A/gi, personA)
        .replace(/Person\s*B/gi, personB || ''); // graceful if B missing
      
      // Clean up any double spaces or trailing spaces from empty Person B replacements
      return result.replace(/\s+/g, ' ').trim();
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

  return replace(swiss);
}

/**
 * Extracts person names from request data (same logic as mapReportPayload)
 * @param requestData - Original request data containing person information
 * @returns Object with personA and personB names
 */
export function extractPersonNames(requestData: any): { personA: string; personB?: string } {
  const personA = requestData.person_a?.name ?? 
                  requestData.name ?? 
                  'Person A';
  
  const personB = requestData.person_b?.name ?? 
                  requestData.secondPersonName ?? 
                  undefined;

  return { personA, personB };
}
