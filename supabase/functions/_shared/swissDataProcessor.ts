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
  if (!swiss || !personA) {
    return swiss;
  }

  let replacementCount = 0;
  
  const replace = (val: any): any => {
    if (typeof val === 'string') {
      let result = val
        .replace(/\bPerson\s*A\b/gi, () => {
          replacementCount++;
          return personA;
        })
        .replace(/\bPerson\s*B\b/gi, () => {
          replacementCount++;
          return personB || '';
        });
      
      return result.replace(/\s+/g, ' ').trim();
    }
    
    if (Array.isArray(val)) {
      return val.map(replace);
    }
    
    if (val && typeof val === 'object') {
      return Object.fromEntries(
        Object.entries(val).map(([k, v]) => [k, replace(v)])
      );
    }
    
    return val;
  };

  const result = replace(swiss) as typeof swiss;
  console.log('[swissDataProcessor] Processed with', replacementCount, 'replacements for', personA, personB ? `& ${personB}` : '');
  
  return result;
}

/**
 * Extracts person names from request data (same logic as mapReportPayload)
 * @param requestData - Original request data containing person information
 * @returns Object with personA and personB names
 */
export function extractPersonNames(requestData: any): { personA: string; personB?: string } {
  const personA = requestData.person_a?.name ?? 
                  requestData.report_data?.name ?? 
                  requestData.name ?? 
                  'Person A';
  
  const personB = requestData.person_b?.name ?? 
                  requestData.secondPersonName ?? 
                  undefined;

  return { personA, personB };
}
