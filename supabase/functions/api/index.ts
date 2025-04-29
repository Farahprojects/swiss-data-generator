
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
  console.log("Starting API key extraction from request headers");
  const authHeader = req.headers.get("authorization");
  console.log("Authorization header:", authHeader ? "Present" : "Missing");
  
  if (!authHeader) return null;

  // Check if it's a Bearer token
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match) {
    console.log("Bearer token format detected");
    return match[1];
  }
  
  console.log("Using raw header as API key");
  return authHeader; // If not in Bearer format, use the raw header
};

// Create a Supabase client
const createSupabaseClient = () => {
  console.log("Creating Supabase client");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  console.log("SUPABASE_URL available:", !!supabaseUrl);
  console.log("SUPABASE_SERVICE_ROLE_KEY available:", !!supabaseServiceKey);
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing environment variables for Supabase client");
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables are not set");
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

// Validate API key against database
const validateApiKey = async (apiKey: string) => {
  console.log("Starting API key validation");
  try {
    const supabase = createSupabaseClient();
    
    // Query the api_keys table to find the key and check if it's active
    console.log("Querying api_keys table for key:", apiKey.substring(0, 4) + "****");
    
    const { data, error } = await supabase
      .from("api_keys")
      .select("user_id, is_active")
      .eq("api_key", apiKey)
      .maybeSingle();
    
    if (error) {
      console.error("Database error during API key validation:", error);
      return { valid: false, userId: null };
    }
    
    console.log("API key lookup result:", data ? "Found" : "Not found");
    
    // Check if the key exists and is active
    if (data) {
      console.log("API key active status:", data.is_active);
      if (data.is_active) {
        console.log("Valid API key for user:", data.user_id);
        return { valid: true, userId: data.user_id };
      }
    }
    
    console.log("Invalid or inactive API key");
    return { valid: false, userId: null };
  } catch (err) {
    console.error("Exception in validateApiKey:", err);
    return { valid: false, userId: null };
  }
};

// Record API usage in the database
const recordApiUsage = async (userId: string) => {
  console.log("Recording API usage for user:", userId);
  try {
    const supabase = createSupabaseClient();
    
    // Insert a record into the api_usage table
    const { error } = await supabase
      .from("api_usage")
      .insert({ user_id: userId });
    
    if (error) {
      console.error("Error recording API usage:", error);
    } else {
      console.log("Successfully recorded API usage");
    }
  } catch (err) {
    console.error("Exception in recordApiUsage:", err);
  }
};

// Main handler function
serve(async (req) => {
  console.log("API function invoked:", new Date().toISOString());
  console.log("Request URL:", req.url);
  console.log("Request method:", req.method);
  
  // Handle CORS preflight request
  const corsResponse = handleCors(req);
  if (corsResponse) {
    console.log("Handling CORS preflight request");
    return corsResponse;
  }

  try {
    // Extract API key from request
    const apiKey = extractApiKey(req);
    
    if (!apiKey) {
      console.log("No API key provided in request");
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
      console.log("API key validation failed");
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
    
    console.log("API request successful");
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
    
    // Return error response with more details for debugging
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "An error occurred while processing your request.",
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
