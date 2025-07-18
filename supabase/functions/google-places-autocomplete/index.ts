// File: /supabase/functions/google-places-autocomplete/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getFromCache, setInCache } from '../_shared/cache.ts'
import { corsHeaders } from '../_shared/utils.ts' // Updated path to match your file structure

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

/**
 * Transforms the raw Google Places API response into a clean, minimal format
 * containing only the data our application needs.
 * @param {any} googleData - The raw JSON response from Google.
 * @returns {Array<object>} A clean array of place objects.
 */
function transformGoogleResponse(googleData: any) {
  if (!googleData || !googleData.predictions) {
    return []; // Return an empty array if the response is invalid or has no predictions
  }

  // The 'fields' parameter is no longer used in the API call, so we must rely on
  // the data available in the standard autocomplete response.
  // The 'place_id' is the most important piece of data for any follow-up 'details' requests.
  return googleData.predictions.map((prediction: any) => {
    return {
      place_id: prediction.place_id,
      description: prediction.description,
      // Note: Coordinates (lat/lng) are NOT available in the standard autocomplete response.
      // A follow-up 'Place Details' call is required if coordinates are needed before user selection.
      // However, for this use case, we will get details AFTER the user selects a place.
    };
  });
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
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Google API request failed with status ${response.status}: ${errorBody}`);
    }
    const googleData = await response.json();

    // Check for API errors in the response body
    if (googleData.status && googleData.status !== 'OK' && googleData.status !== 'ZERO_RESULTS') {
      throw new Error(`Google API error: ${googleData.status} - ${googleData.error_message || 'Unknown error'}`);
    }

    // --- TRANSFORMATION STEP ---
    const cleanData = transformGoogleResponse(googleData);

    // 4. STORE THE CLEAN RESULT IN CACHE
    // We store the clean, minimal data, not the raw Google response.
    await setInCache(query_hash, cleanData, query, supabaseClient);

    // 5. RETURN THE CLEAN DATA TO THE CLIENT
    return new Response(JSON.stringify(cleanData), {
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