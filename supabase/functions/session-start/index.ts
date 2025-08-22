import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  console.log(`[session-start] Received ${req.method} request`);

  if (req.method === 'OPTIONS') {
    console.log('[session-start] Handling OPTIONS request');
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
    console.log('[session-start] Request body:', body);
    
    const { chat_id, mode } = body;

    if (!chat_id || !mode) {
      console.error('[session-start] Missing required fields');
      return new Response(JSON.stringify({
        error: "Missing required fields: chat_id, mode"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    if (mode !== 'convo' && mode !== 'normal') {
      console.error('[session-start] Invalid mode');
      return new Response(JSON.stringify({
        error: "Invalid mode. Must be 'convo' or 'normal'"
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

    // Generate session ID
    const sessionId = crypto.randomUUID();
    const audioStreamUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/audio-stream/${sessionId}`;

    // Store session info in database
    const { error: sessionError } = await supabase
      .from("conversation_sessions")
      .insert({
        session_id: sessionId,
        chat_id: chat_id,
        mode: mode,
        status: "active",
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      });

    if (sessionError) {
      console.error('[session-start] Failed to create session:', sessionError);
      return new Response(JSON.stringify({
        error: "Failed to create session"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    console.log(`[session-start] Created session ${sessionId} for chat ${chat_id} in ${mode} mode`);

    return new Response(JSON.stringify({
      sessionId,
      audioStreamUrl,
      status: "active",
      mode
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error('[session-start] Error:', error);
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
