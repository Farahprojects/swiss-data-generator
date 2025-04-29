
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set up CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Handle CORS preflight requests
const handleCors = (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  return null;
};

// Extract API key from Authorization header
const extractApiKey = (req: Request): string | null => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  // Check if it's a Bearer token
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match) return match[1];
  
  return authHeader; // If not in Bearer format, use the raw header
};

// Create a Supabase client
const createSupabaseClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables are not set");
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Validate API key against database
const validateApiKey = async (apiKey: string) => {
  try {
    const supabase = createSupabaseClient();
    
    // Query the api_keys table to find the key and check if it's active
    const { data, error } = await supabase
      .from("api_keys")
      .select("user_id, is_active")
      .eq("api_key", apiKey)
      .maybeSingle();
    
    if (error) {
      console.error("Error validating API key:", error);
      return { valid: false, userId: null };
    }
    
    // Check if the key exists and is active
    if (data && data.is_active) {
      return { valid: true, userId: data.user_id };
    }
    
    return { valid: false, userId: null };
  } catch (err) {
    console.error("Error in validateApiKey:", err);
    return { valid: false, userId: null };
  }
};

// Record API usage in the database
const recordApiUsage = async (userId: string) => {
  try {
    const supabase = createSupabaseClient();
    
    // Insert a record into the api_usage table
    const { error } = await supabase
      .from("api_usage")
      .insert({ user_id: userId });
    
    if (error) {
      console.error("Error recording API usage:", error);
    }
  } catch (err) {
    console.error("Error in recordApiUsage:", err);
  }
};

// Main handler function
serve(async (req) => {
  // Handle CORS preflight request
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Extract API key from request
    const apiKey = extractApiKey(req);
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "API key is required. Provide it in the Authorization header." 
        }),
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Validate the API key
    const { valid, userId } = await validateApiKey(apiKey);
    
    if (!valid) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Invalid or inactive API key." 
        }),
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Record API usage
    if (userId) {
      await recordApiUsage(userId);
    }
    
    // Return successful response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "API authentication successful.",
        timestamp: new Date().toISOString(),
        endpoint: new URL(req.url).pathname,
        method: req.method,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "An error occurred while processing your request." 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
