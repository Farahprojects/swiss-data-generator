// Unified astrological position formatting utilities for Supabase functions
// Handles positions with {deg: number (0-30), sign: string} format

export type ZodiacPos = { 
  deg?: number; 
  sign?: string; 
};

/**
 * Format decimal degrees as degrees and minutes (e.g., 11.83 → "11°49'")
 * Uses Math.floor for minutes to avoid 60' carry-over and 30°00' edge cases
 */
export function formatDegMin(dec?: number): string {
  if (typeof dec !== "number" || !isFinite(dec)) return "—";
  
  const d = Math.floor(dec);
  // Use FLOOR for minutes to avoid 60' carry and 30°00' edge cases
  const m = Math.floor((dec - d) * 60);
  
  return `${d}°${String(m).padStart(2, "0")}'`;
}

/**
 * Format a zodiac position as "degrees°minutes' in Sign" (e.g., "11°49' in Gemini")
 * Returns "—" for invalid/missing data to avoid undefined/NaN display
 */
export function formatPos(p?: ZodiacPos): string {
  if (!p || typeof p.deg !== "number" || !p.sign) return "—";
  
  return `${formatDegMin(p.deg)} in ${p.sign}`;
}

/**
 * Format a position with house information appended
 * e.g., "11°49' in Gemini (House 7)" or "11°49' in Gemini (Natal House 1)"
 */
export function formatPosWithHouse(p?: ZodiacPos & { house?: number; natal_house?: number }): string {
  const basePos = formatPos(p);
  if (basePos === "—") return basePos;
  
  let houseLabel = "";
  if (p?.house) {
    houseLabel = ` (House ${p.house})`;
  } else if (p?.natal_house) {
    houseLabel = ` (Natal House ${p.natal_house})`;
  }
  
  return basePos + houseLabel;
}
