
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const createSupabaseClient = (authorization?: string) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization || "" } },
    auth: { persistSession: false },
  });
};

export const createServiceClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Handle CORS preflight requests
export const handleCors = (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
};

// Helper to get user from auth header
export const getUserFromHeader = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { user: null, error: "No authorization header" };
  }

  const supabase = createSupabaseClient(authHeader);
  const { data, error } = await supabase.auth.getUser();
  
  if (error || !data.user) {
    return { user: null, error: error?.message || "Invalid token" };
  }
  
  return { user: data.user, error: null };
};
