import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  console.log(`[chat-send-callback] Received ${req.method} request`);

  if (req.method === 'OPTIONS') {
    console.log('[chat-send-callback] Handling OPTIONS request');
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
    console.log('[chat-send-callback] Request body:', body);
    
    const { chat_id, assistantMessage, client_msg_id } = body;

    if (!chat_id || !assistantMessage) {
      console.error('[chat-send-callback] Missing required fields');
      return new Response(JSON.stringify({
        error: "Missing required fields: chat_id, assistantMessage"
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
    console.log('[chat-send-callback] Supabase client created');

    // Save assistant message to database (fire and forget)
    const assistantMessageData = {
      chat_id,
      role: "assistant",
      text: assistantMessage.text,
      status: "complete",
      meta: {
        ...assistantMessage.meta,
        callback_source: "llm-handler"
      }
    };

    console.log('[chat-send-callback] Inserting assistant message:', assistantMessageData);
    supabase
      .from("messages")
      .insert(assistantMessageData)
      .then(() => {
        console.log('[chat-send-callback] Assistant message saved successfully');
      })
      .catch((error) => {
        console.error('[chat-send-callback] Failed to save assistant message:', error);
      });

    // Broadcast the assistant message via Supabase Realtime for immediate UI update
    console.log('[chat-send-callback] Broadcasting assistant message via Realtime');
    supabase
      .channel(`chat:${chat_id}`)
      .send({
        type: 'broadcast',
        event: 'assistant_message',
        payload: {
          chat_id,
          assistantMessage,
          client_msg_id
        }
      })
      .then(() => {
        console.log('[chat-send-callback] Message broadcasted successfully');
      })
      .catch((error) => {
        console.error('[chat-send-callback] Failed to broadcast message:', error);
      });

    // Return success response
    return new Response(JSON.stringify({
      message: "Assistant message processed and broadcasted"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error('[chat-send-callback] Error:', error);
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
