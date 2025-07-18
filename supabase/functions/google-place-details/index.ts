import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { placeId } = await req.json();
    if (!placeId) throw new Error('placeId is required');

    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);

    // --- 1. CHECK geo_cache FIRST ---
    const { data: cachedData, error: cacheError } = await supabaseClient
      .from('geo_cache')
      .select('place, lat, lon')
      .eq('place_id', placeId)
      .single();

    if (cacheError && cacheError.code !== 'PGRST116') throw cacheError;

    if (cachedData) {
      console.log(`Cache HIT for placeId: ${placeId}`);
      // Return the clean, cached data, renaming columns to match frontend expectations
      return new Response(JSON.stringify({
        name: cachedData.place,
        latitude: cachedData.lat,
        longitude: cachedData.lon
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Cache MISS for placeId: ${placeId}. Fetching from Google.`);

    // --- 2. CACHE MISS: FETCH FROM GOOGLE ---
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')!;
    const fields = 'geometry,name';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}&fields=${fields}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Google Place Details API request failed');
    
    const data = await response.json();
    if (data.status !== 'OK') throw new Error(`Google API Error: ${data.status}`);

    // --- 3. PREPARE & POPULATE geo_cache ---
    const placeDataToCache = {
      place_id: placeId,
      place: data.result.name,
      lat: data.result.geometry.location.lat,
      lon: data.result.geometry.location.lng,
    };
    await supabaseClient.from('geo_cache').insert(placeDataToCache);

    // --- 4. RETURN CLEAN DATA TO FRONTEND ---
    const placeDataToReturn = {
        name: placeDataToCache.place,
        latitude: placeDataToCache.lat,
        longitude: placeDataToCache.lon
    };
    return new Response(JSON.stringify(placeDataToReturn), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})