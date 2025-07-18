import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    if (!placeId) {
      throw new Error('placeId is required');
    }

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')!;
    const fields = 'geometry,name,address_components';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}&fields=${fields}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Google Place Details API request failed');
    
    const data = await response.json();
    if (data.status !== 'OK') throw new Error(`Google API Error: ${data.status}`);

    return new Response(JSON.stringify(data.result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})