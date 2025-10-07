// test 
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Create Supabase client once at module scope for better performance
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: {
      persistSession: false
    }
  }
);

// Cache environment variables at module scope
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
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
    const { chat_id, text, client_msg_id, mode, chattype, role, sessionId, user_id } = body;

    console.log(`[chat-send] 🚀 FUNCTION STARTED - chat_id: ${chat_id}, role: ${role || 'user'}, mode: ${mode || 'default'}`);
    console.log(`[chat-send] 📥 REQUEST BODY DEBUG:`, JSON.stringify({ chat_id, text: text?.substring(0, 50), client_msg_id, mode, role, sessionId }, null, 2));

    if (!chat_id || !text) {
      return new Response(JSON.stringify({
        error: "Missing required fields: chat_id, text"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // message_number assigned automatically by DB trigger (assign_message_number)
    // No need to await RPC - trigger handles sequencing

    // If this is an assistant message (e.g., from LLM in voice mode), save assistant only
    if (role === 'assistant') {
      console.log(`[chat-send] 🎯 ASSISTANT MESSAGE RECEIVED - chat_id: ${chat_id}, text: ${text.substring(0, 50)}...`);
      
      const assistantMessageData = {
        chat_id,
        role: "assistant",
        text: text,
        client_msg_id: client_msg_id || crypto.randomUUID(),
        status: "complete",
        mode: mode || 'chat',
        user_id: user_id, // Add user_id for assistant messages too
        meta: {}
        // message_number assigned by DB trigger (backend use only)
      };

      console.log(`[chat-send] 💾 SAVING ASSISTANT MESSAGE TO DB (trigger will assign message_number)`);
      
      // Fire-and-forget: Save assistant message to database
      supabase
        .from("messages")
        .insert(assistantMessageData, {
          onConflict: "client_msg_id",
          ignoreDuplicates: true,
          returning: "minimal"
        })
        .then(({ data: insertData, error: assistantError }) => {
          if (assistantError) {
            console.error('[chat-send] ❌ FAILED TO SAVE ASSISTANT MESSAGE:', assistantError);
          } else {
            console.log(`[chat-send] ✅ ASSISTANT MESSAGE SAVED TO DB SUCCESSFULLY`);
          }
        })
        .catch((err) => {
          console.error('[chat-send] ❌ ASSISTANT MESSAGE SAVE ERROR:', err);
        });
      return new Response(JSON.stringify({
        message: "Assistant message saved successfully",
        assistant_message: assistantMessageData
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Otherwise, treat as a user message save
    console.log(`[chat-send] 👤 USER MESSAGE RECEIVED - chat_id: ${chat_id}, text: ${text.substring(0, 50)}...`);
    
    const userMessageData = {
      chat_id,
      role: "user",
      text: text,
      client_msg_id: client_msg_id || crypto.randomUUID(),
      status: "complete",
      mode: mode || 'chat',
      user_id: user_id, // Add user_id for user messages
      meta: {}
      // message_number assigned by DB trigger (backend use only)
    };

    console.log(`[chat-send] 💾 SAVING USER MESSAGE TO DB (fire-and-forget)`);
    
    // Fire-and-forget: Save user message to database
    supabase
      .from("messages")
      .insert(userMessageData, {
        onConflict: "client_msg_id",
        ignoreDuplicates: true,
        returning: "minimal"
      })
      .then(({ data: userInsertData, error: userError }) => {
        if (userError) {
          console.error('[chat-send] ❌ FAILED TO SAVE USER MESSAGE:', userError);
        } else {
          console.log(`[chat-send] ✅ USER MESSAGE SAVED TO DB SUCCESSFULLY`);
        }
      })
      .catch((err) => {
        console.error('[chat-send] ❌ USER MESSAGE SAVE ERROR:', err);
      });

    // For voice mode, just save user message (STT handles LLM call separately)
    if (chattype === 'voice') {
      console.log('[chat-send] 🎤 VOICE MODE: User message saved, no LLM call needed');
      return new Response(JSON.stringify({
        message: "User message saved successfully",
        user_message: userMessageData
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // (Assistant path handled above)

    // For non-voice: Now call LLM handler (user message is committed)
    console.log(`[chat-send] 🤖 CALLING LLM HANDLER - chat_id: ${chat_id}`);
    fetch(`${SUPABASE_URL}/functions/v1/llm-handler-gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        chat_id,
        text: text,
        mode: mode,
        user_id: user_id
      })
    }).then((response) => {
      console.log(`[chat-send] ✅ LLM HANDLER CALLED SUCCESSFULLY - status: ${response.status}`);
    }).catch((err) => {
      console.error('[chat-send] ❌ LLM HANDLER CALL FAILED:', err);
    });

    console.log('[chat-send] 🚀 USER MESSAGE SAVED, LLM PROCESSING STARTED');
    return new Response(JSON.stringify({
      message: "User message saved; LLM processing started",
      user_message: userMessageData
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
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
