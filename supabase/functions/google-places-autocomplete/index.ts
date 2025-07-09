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
    
    // Add user agent logging for debugging mobile issues
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    console.log(`📱 Request from ${isMobile ? 'mobile' : 'desktop'} device:`, userAgent.substring(0, 100));
    
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
    
    console.log('🔍 Making request to Google Places API for input:', input);
    
    // Add retry logic for mobile reliability
    let response;
    let data;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        response = await fetch(url, {
          headers: {
            'User-Agent': 'TheRAI-Autocomplete/1.0'
          }
        });
        data = await response.json();
        
        if (response.ok) break;
        
        if (retryCount === maxRetries) throw new Error(`API request failed after ${maxRetries + 1} attempts`);
        
        console.warn(`Retry ${retryCount + 1}/${maxRetries} for Google Places API`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        retryCount++;
      } catch (error) {
        if (retryCount === maxRetries) throw error;
        console.warn(`Network error, retrying... (${retryCount + 1}/${maxRetries})`);
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      }
    }

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

    const predictions = data.predictions || [];
    console.log(`✅ Successfully retrieved ${predictions.length} autocomplete suggestions`);
    
    // Add mobile-specific optimizations
    const optimizedPredictions = predictions.map((prediction: any) => ({
      ...prediction,
      // Ensure structured formatting for better mobile display
      structured_formatting: prediction.structured_formatting || {
        main_text: prediction.description.split(',')[0],
        secondary_text: prediction.description.split(',').slice(1).join(',').trim()
      }
    }));
    
    return new Response(
      JSON.stringify({
        predictions: optimizedPredictions,
        status: data.status,
        mobile_optimized: isMobile
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