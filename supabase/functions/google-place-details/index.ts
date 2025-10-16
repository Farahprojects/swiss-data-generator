
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { placeId } = await req.json();
    if (!placeId) throw new Error('placeId is required');

    // Use service role client for database operations to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!, 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log(`🔍 Processing place details request for placeId: ${placeId}`);

    // --- 1. ALWAYS FETCH FROM GOOGLE (no cache check to avoid race conditions) ---
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')!;
    const fields = 'geometry,name';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}&fields=${fields}`;
    
    console.log(`🌐 Calling Google Places API: ${url.replace(GOOGLE_API_KEY, '[REDACTED]')}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Place Details API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📍 Google API response:', JSON.stringify(data, null, 2));
    
    if (data.status !== 'OK') {
      throw new Error(`Google API Error: ${data.status}`);
    }

    // --- 2. RETURN CLEAN DATA TO FRONTEND IMMEDIATELY ---
    const placeDataToReturn = {
        name: data.result.name,
        latitude: data.result.geometry.location.lat,
        longitude: data.result.geometry.location.lng
    };
    
    console.log('📤 Returning place data:', placeDataToReturn);

    // --- 3. CACHE IN BACKGROUND (fire-and-forget) ---
    const placeDataToCache = {
      place_id: placeId,
      place: data.result.name,
      lat: data.result.geometry.location.lat,
      lon: data.result.geometry.location.lng,
    };
    
    // Cache asynchronously without waiting for result
    supabaseClient
      .from('geo_cache')
      .insert(placeDataToCache)
      .then(({ error }) => {
        if (error) {
          console.error('❌ Failed to cache place data:', error);
        } else {
          console.log('✅ Successfully cached place data (background)');
        }
      })
      .catch(err => {
        console.error('❌ Cache insert failed:', err);
      });
    
    return new Response(JSON.stringify(placeDataToReturn), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Edge function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
