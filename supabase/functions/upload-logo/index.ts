
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogData {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, any>;
  page?: string;
}

// Structured logging function
function logMessage(message: string, logData: Omit<LogData, 'message'>) {
  const { level, data = {}, page = 'upload-logo' } = logData;
  const logObject = {
    level,
    message,
    page,
    data: { ...data, timestamp: new Date().toISOString() }
  };

  // Log in a format that will be easy to parse
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(logObject));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logMessage("Logo upload request received", { level: 'info' });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      logMessage("Missing Supabase credentials", { level: 'error' });
      return new Response(
        JSON.stringify({ error: 'Configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch SVG file from public URL
    logMessage("Fetching logo file", { level: 'info' });
    const svgResponse = await fetch(`${supabaseUrl}/storage/v1/object/public/therai-assets/therai-astro-logo.svg`);
    
    if (!svgResponse.ok) {
      // If file doesn't exist yet in storage, fetch it from the public folder
      const publicSvgUrl = `${req.url.split('/functions/')[0]}/images/therai-astro-logo.svg`;
      logMessage("Fetching from public folder", { 
        level: 'info',
        data: { url: publicSvgUrl }
      });
      
      const publicSvgResponse = await fetch(publicSvgUrl);
      
      if (!publicSvgResponse.ok) {
        logMessage("Failed to fetch logo file", { 
          level: 'error',
          data: { status: publicSvgResponse.status } 
        });
        return new Response(
          JSON.stringify({ error: 'Logo file not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Upload SVG to storage
      const svgFile = await publicSvgResponse.blob();
      const { error: uploadError } = await supabase
        .storage
        .from('therai-assets')
        .upload('therai-astro-logo.svg', svgFile, {
          contentType: 'image/svg+xml',
          upsert: true
        });
      
      if (uploadError) {
        logMessage("Upload failed", { 
          level: 'error',
          data: { error: uploadError.message } 
        });
        return new Response(
          JSON.stringify({ error: 'Upload failed', details: uploadError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    logMessage("Logo upload completed successfully", { level: 'info' });
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    logMessage("Unexpected error", { 
      level: 'error',
      data: { 
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      }
    });
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
