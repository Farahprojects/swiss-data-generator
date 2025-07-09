import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🌍 Google Places Autocomplete function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input, types = 'geocode', componentRestrictions } = await req.json();
    
    if (!input) {
      return new Response(
        JSON.stringify({ error: 'Input parameter is required' }),
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

    // Build the URL for Google Places Autocomplete API
    const baseUrl = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
    const params = new URLSearchParams({
      input: input,
      key: googleMapsApiKey,
      types: types,
    });

    // Add component restrictions if provided
    if (componentRestrictions) {
      const restrictions = Object.entries(componentRestrictions)
        .map(([key, value]) => `${key}:${value}`)
        .join('|');
      params.append('components', restrictions);
    }

    const url = `${baseUrl}?${params.toString()}`;
    
    console.log('🔍 Making request to Google Places API');
    
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Google Places API error:', data);
      return new Response(
        JSON.stringify({ 
          error: 'Google Places API error', 
          details: data 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Successfully retrieved autocomplete suggestions');
    
    return new Response(
      JSON.stringify({
        predictions: data.predictions || [],
        status: data.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Error in google-places-autocomplete function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});