
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6"
import { corsHeaders } from "../_shared/cors.ts"

// Define the response types
interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// Initialize the Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Add CORS headers to all responses
  const headers = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // Get API Key from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      const response: ApiResponse = { 
        success: false, 
        message: "Missing API key", 
        error: "No API key provided in Authorization header" 
      };
      return new Response(JSON.stringify(response), { status: 401, headers });
    }

    // Extract the API key (format should be "Bearer thp_xxxxx")
    const apiKey = authHeader.replace('Bearer ', '');
    if (!apiKey || !apiKey.startsWith('thp_')) {
      const response: ApiResponse = { 
        success: false, 
        message: "Invalid API key format", 
        error: "API key should start with 'thp_'" 
      };
      return new Response(JSON.stringify(response), { status: 401, headers });
    }

    // Validate API key against database
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('user_id, is_active')
      .eq('api_key', apiKey)
      .maybeSingle();

    if (apiKeyError || !apiKeyData) {
      const response: ApiResponse = { 
        success: false, 
        message: "Authentication failed", 
        error: "Invalid API key" 
      };
      return new Response(JSON.stringify(response), { status: 401, headers });
    }

    if (!apiKeyData.is_active) {
      const response: ApiResponse = { 
        success: false, 
        message: "API key is inactive", 
        error: "This API key has been deactivated" 
      };
      return new Response(JSON.stringify(response), { status: 403, headers });
    }

    // Get the URL path to determine which API endpoint is being accessed
    const url = new URL(req.url);
    const path = url.pathname.split('/api')[1] || '/';
    const params = Object.fromEntries(url.searchParams.entries());
    
    // Log the API call
    const { error: logError } = await supabase
      .from('api_usage')
      .insert({
        user_id: apiKeyData.user_id,
        endpoint_id: null, // We'll implement endpoint lookup in future updates
        ai_used: false
      });

    if (logError) {
      console.error("Error logging API call:", logError);
    }

    // Route API requests (currently just a test endpoint)
    let responseData: ApiResponse;

    // Simple test endpoint
    if (path === '/' || path === '') {
      responseData = {
        success: true,
        message: "API connection successful",
        data: {
          timestamp: new Date().toISOString(),
          params: params
        }
      };
    } else {
      responseData = {
        success: false,
        message: "Endpoint not found",
        error: `The requested endpoint '${path}' does not exist`
      };
      return new Response(JSON.stringify(responseData), { status: 404, headers });
    }

    // Return successful response
    return new Response(JSON.stringify(responseData), { status: 200, headers });

  } catch (error) {
    // Handle unexpected errors
    console.error("API Error:", error);
    const response: ApiResponse = { 
      success: false, 
      message: "Server error", 
      error: "An unexpected error occurred" 
    };
    return new Response(JSON.stringify(response), { status: 500, headers });
  }
});
