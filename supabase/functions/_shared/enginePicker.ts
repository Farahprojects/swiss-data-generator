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
    // 1) Get the next sequence value (atomic, super-fast)
    const { data, error } = await supabaseAdmin
      .rpc("nextval", { sequence_name: "engine_selector_seq" })
      .single();

    if (error || !data?.nextval) {
      console.error("[enginePicker] Sequence fetch failed:", error);
      throw new Error("Sequence fetch failed");
    }

    // 2) Simple modulo gives round-robin index
    const idx = Number(data.nextval) % TOTAL_ENGINES;
    const selectedEngine = ENGINES[idx];
    
    console.log(`[enginePicker] Selected engine: ${selectedEngine} (sequence: ${data.nextval}, index: ${idx})`);
    return selectedEngine;
    
  } catch (error) {
    console.error("[enginePicker] Engine selection failed:", error);
    // Fallback to first engine if sequence fails
    return ENGINES[0];
  }
} 