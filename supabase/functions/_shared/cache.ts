// File: /supabase/functions/_shared/cache.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// This defines the shape of the data we expect to get from the DB.
// Using 'unknown' for place_data makes this helper generic for future use.
interface CacheEntry {
  place_data: unknown;
}

/**
 * Retrieves a non-expired entry from the 'autocomplete_cache' table.
 * @param {string} key - The unique hash key for the cached item (e.g., a SHA-256 hash of the search query).
 * @param {SupabaseClient} supabaseClient - An active Supabase client instance.
 * @returns {Promise<unknown | null>} The cached data (as JSON) if found and valid, otherwise null.
 */
export async function getFromCache(key: string, supabaseClient: SupabaseClient): Promise<unknown | null> {
  const { data, error } = await supabaseClient
    .from('autocomplete_cache') // The name of our new table
    .select('place_data')      // We only need the data itself
    .eq('query_hash', key)     // Find the entry by its unique hash
    .gt('expires_at', 'now()') // CRITICAL: Only get entries that have not expired
    .single<CacheEntry>();     // We expect at most one result

  // The 'PGRST116' error code means 'No rows found'. This is a normal cache miss, not an actual error.
  // We should only log real database errors.
  if (error && error.code !== 'PGRST116') {
    console.error('Cache read error:', error.message);
    return null; // On error, act as if it's a cache miss
  }

  // If data was found, return the 'place_data' property. Otherwise, return null.
  return data ? data.place_data : null;
}

/**
 * Stores a new entry in the 'autocomplete_cache' table.
 * @param {string} key - The unique hash key for the item.
 * @param {unknown} dataToCache - The JSON-compatible data to be stored.
 * @param {string} rawQuery - The original user search term. Stored for debugging and analysis.
 * @param {SupabaseClient} supabaseClient - An active Supabase client instance.
 * @returns {Promise<void>}
 */
export async function setInCache(key: string, dataToCache: unknown, rawQuery: string, supabaseClient: SupabaseClient): Promise<void> {
  const { error } = await supabaseClient
    .from('autocomplete_cache')
    .insert({
      query_hash: key,
      place_data: dataToCache,
      query_text: rawQuery,
      // Note: 'created_at' and 'expires_at' will be set automatically by the database
      // because we defined DEFAULT values in our CREATE TABLE script.
    });

  if (error) {
    // We log the error but don't throw, as failing to cache shouldn't break the main flow.
    console.error('Cache write error:', error.message);
  }
} 