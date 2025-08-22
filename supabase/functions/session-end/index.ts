import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  console.log(`[session-end] Received ${req.method} request`);

  if (req.method === 'OPTIONS') {
    console.log('[session-end] Handling OPTIONS request');
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const body = await req.json();
    console.log('[session-end] Request body:', body);
    
    const { sessionId } = body;

    if (!sessionId) {
      console.error('[session-end] Missing sessionId');
      return new Response(JSON.stringify({
        error: "Missing required field: sessionId"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          persistSession: false
        }
      }
    );

    // Update session status to ended
    const { error: sessionError } = await supabase
      .from("conversation_sessions")
      .update({
        status: "ended",
        ended_at: new Date().toISOString()
      })
      .eq("session_id", sessionId);

    if (sessionError) {
      console.error('[session-end] Failed to end session:', sessionError);
      return new Response(JSON.stringify({
        error: "Failed to end session"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    console.log(`[session-end] Ended session ${sessionId}`);

    return new Response(JSON.stringify({
      sessionId,
      status: "ended"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error('[session-end] Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
