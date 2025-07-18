// File: /supabase/functions/google-places-autocomplete/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Import our new caching helpers
import { getFromCache, setInCache } from '../_shared/cache.ts'
// Import your shared CORS headers
import { corsHeaders } from '../_shared/utils.ts'

/**
 * Creates a consistent, URL-safe SHA-256 hash from a string.
 * This is our cache key.
 */
async function createCacheKey(message: string) {
  const data = new TextEncoder().encode(message.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Standard CORS preflight request handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Query string is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. INITIALIZE CLIENTS AND GENERATE CACHE KEY
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
    const query_hash = await createCacheKey(query);

    // 2. CHECK CACHE FIRST
    // Use our helper to see if we have a fresh, valid result.
    const cachedData = await getFromCache(query_hash, supabaseClient);
    if (cachedData) {
      console.log(`Cache HIT for query: "${query}"`);
      return new Response(JSON.stringify(cachedData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Cache MISS for query: "${query}". Fetching from Google.`);

    // 3. CACHE MISS: FETCH FROM GOOGLE API
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')!;
    // CRITICAL: We request all the fields we need in this single call.
    const fields = 'geometry,name,place_id,address_components';
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&fields=${fields}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Google API request failed with status ${response.status}: ${errorBody}`);
    }
    const googleData = await response.json();

    // 4. STORE THE NEW RESULT IN CACHE
    // Use our helper to store the fresh data for next time.
    await setInCache(query_hash, googleData, query, supabaseClient);

    // 5. RETURN THE FRESH DATA TO THE CLIENT
    return new Response(JSON.stringify(googleData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})