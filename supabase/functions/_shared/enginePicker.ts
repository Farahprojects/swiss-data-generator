// Engine picker utility for atomic round-robin selection
// Uses PostgreSQL sequence for O(1) performance that scales to thousands of concurrent users

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Available engines for round-robin selection
export const ENGINES = [
  "standard-report",
  "standard-report-one", 
  "standard-report-two",
];

export const TOTAL_ENGINES = ENGINES.length;

export async function pickNextEngine(supabaseAdmin: SupabaseClient): Promise<string> {
  try {
    // 1) Get the next sequence value using our custom function (atomic, super-fast)
    const { data, error } = await supabaseAdmin
      .rpc('get_next_engine_sequence')
      .single();

    if (error || data === null || data === undefined) {
      console.error("[enginePicker] Sequence fetch failed:", error);
      throw new Error("Sequence fetch failed");
    }

    // 2) Simple modulo gives round-robin index
    const idx = Number(data) % TOTAL_ENGINES;
    const selectedEngine = ENGINES[idx];
    
    console.log(`[enginePicker] Selected engine: ${selectedEngine} (sequence: ${data}, index: ${idx})`);
    return selectedEngine;
    
  } catch (error) {
    console.error("[enginePicker] Engine selection failed:", error);
    // Fallback to first engine if sequence fails
    return ENGINES[0];
  }
} 