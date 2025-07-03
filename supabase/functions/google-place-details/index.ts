import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('📍 Google Place Details function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeId, fields = 'geometry,formatted_address,name' } = await req.json();
    
    if (!placeId) {
      return new Response(
        JSON.stringify({ error: 'placeId parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    if (!googleMapsApiKey) {
      console.error('❌ Google Maps API key not found');
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the URL for Google Place Details API
    const baseUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
    const params = new URLSearchParams({
      place_id: placeId,
      fields: fields,
      key: googleMapsApiKey,
    });

    const url = `${baseUrl}?${params.toString()}`;
    
    console.log('🔍 Making request to Google Place Details API');
    
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Google Place Details API error:', data);
      return new Response(
        JSON.stringify({ 
          error: 'Google Place Details API error', 
          details: data 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Successfully retrieved place details');
    
    return new Response(
      JSON.stringify({
        result: data.result || {},
        status: data.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Error in google-place-details function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});