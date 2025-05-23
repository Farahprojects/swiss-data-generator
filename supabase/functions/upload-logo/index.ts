
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Read the SVG file
    const svgResponse = await fetch('https://wrvqqvqvwqmfdqvqmaar.supabase.co/_next/static/media/therai-astro-logo.svg');
    if (!svgResponse.ok) {
      const fallbackSvgData = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200" viewBox="0 0 600 200">
        <style>
          .black { fill: #000000; }
          .purple { fill: #6C3EA8; }
        </style>
        <text x="0" y="120" class="black" font-family="serif" font-size="120" font-weight="bold">Therai.</text>
        <text x="280" y="120" class="purple" font-family="sans-serif" font-size="120" font-weight="bold">Astro</text>
      </svg>`;
      
      // Create a bucket first if it doesn't exist
      const { error: bucketError } = await supabase.storage
        .createBucket('therai-assets', { public: true });
      
      // Upsert the logo to the storage bucket
      const { error } = await supabase.storage
        .from('therai-assets')
        .upload('therai-astro-logo.svg', new Blob([fallbackSvgData], { type: 'image/svg+xml' }), {
          contentType: 'image/svg+xml',
          upsert: true,
        });
        
      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to upload logo', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { data: publicUrlData } = supabase.storage
        .from('therai-assets')
        .getPublicUrl('therai-astro-logo.svg');
        
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Logo uploaded successfully using fallback data',
          url: publicUrlData.publicUrl
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const svgData = await svgResponse.blob();
    
    // Create a bucket first if it doesn't exist
    const { error: bucketError } = await supabase.storage
      .createBucket('therai-assets', { public: true });
    
    // Upsert the logo to the storage bucket
    const { error } = await supabase.storage
      .from('therai-assets')
      .upload('therai-astro-logo.svg', svgData, {
        contentType: 'image/svg+xml',
        upsert: true,
      });
      
    if (error) {
      return new Response(
        JSON.stringify({ error: 'Failed to upload logo', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { data: publicUrlData } = supabase.storage
      .from('therai-assets')
      .getPublicUrl('therai-astro-logo.svg');
      
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Logo uploaded successfully',
        url: publicUrlData.publicUrl
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
