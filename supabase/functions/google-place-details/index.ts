import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/utils.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { placeId } = await req.json();
    
    if (!placeId || typeof placeId !== 'string') {
      return new Response(JSON.stringify({ error: 'Place ID is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')!;
    const fields = 'geometry,name,formatted_address,address_components';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_API_KEY}`;

    console.log(`Fetching place details for place_id: ${placeId}`);

    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Google Place Details API request failed with status ${response.status}: ${errorBody}`);
    }
    
    const googleData = await response.json();

    // Check for API errors
    if (googleData.status && googleData.status !== 'OK') {
      throw new Error(`Google Place Details API error: ${googleData.status} - ${googleData.error_message || 'Unknown error'}`);
    }

    if (!googleData.result) {
      throw new Error('No place details found');
    }

    return new Response(JSON.stringify(googleData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Place details error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})