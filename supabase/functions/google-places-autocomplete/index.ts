// File: /supabase/functions/google-places-autocomplete/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function transformGoogleResponse(googleData: any) {
  if (!googleData || !googleData.predictions) return [];
  return googleData.predictions.map((p: any) => ({
    place_id: p.place_id,
    description: p.description,
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      throw new Error('Query string is required.');
    }

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')!;
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Google Autocomplete API request failed');

    const googleData = await response.json();
    if (googleData.status !== 'OK' && googleData.status !== 'ZERO_RESULTS') {
      throw new Error(`Google API error: ${googleData.status}`);
    }

    const cleanData = transformGoogleResponse(googleData);

    return new Response(JSON.stringify(cleanData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})