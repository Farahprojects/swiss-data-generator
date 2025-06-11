
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🔍 get-google-maps-key function called');
  console.log('📋 Request method:', req.method);
  console.log('📋 Request URL:', req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('📋 Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔑 Attempting to retrieve Google Maps API key from environment');
    
    // Get the Google Maps API key from environment
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    console.log('🔍 API key exists:', !!googleMapsApiKey);
    console.log('🔍 API key length:', googleMapsApiKey?.length || 0);
    console.log('📋 Available env vars:', Object.keys(Deno.env.toObject()));
    
    if (!googleMapsApiKey) {
      console.error('❌ Google Maps API key not found in environment variables');
      
      return new Response(
        JSON.stringify({ 
          error: 'Google Maps API key not configured',
          debug: 'GOOGLE_MAPS_API_KEY environment variable is missing',
          availableEnvVars: Object.keys(Deno.env.toObject())
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (googleMapsApiKey.length < 10) {
      console.error('❌ Google Maps API key appears to be invalid (too short)');
      return new Response(
        JSON.stringify({ 
          error: 'Google Maps API key appears to be invalid',
          debug: 'API key is too short'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Successfully retrieved Google Maps API key');
    
    return new Response(
      JSON.stringify({ 
        apiKey: googleMapsApiKey,
        success: true 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('💥 Error in get-google-maps-key function:', error);
    console.error('💥 Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        debug: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
