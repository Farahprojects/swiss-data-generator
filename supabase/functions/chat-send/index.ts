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
    const { chat_id, text, client_msg_id, mode, role, sessionId } = body;

    console.log(`[chat-send] 🚀 FUNCTION STARTED - chat_id: ${chat_id}, role: ${role || 'user'}, mode: ${mode || 'default'}`);

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



    // Get the next message number for this chat using the database function
    const { data: userMessageNumber, error: userNumberError } = await supabase
      .rpc('get_next_message_number', { p_chat_id: chat_id });

    if (userNumberError) {
      return new Response(JSON.stringify({
        error: "Failed to get message number"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const nextMessageNumber = userMessageNumber;

    // If this is an assistant message (e.g., from LLM in conversation mode), save assistant only
    if (role === 'assistant') {
      console.log(`[chat-send] 🎯 ASSISTANT MESSAGE RECEIVED - chat_id: ${chat_id}, text: ${text.substring(0, 50)}...`);
      
      const assistantMessageData = {
        chat_id,
        role: "assistant",
        text: text,
        client_msg_id: client_msg_id || crypto.randomUUID(),
        status: "complete",
        message_number: nextMessageNumber,
        meta: {}
      };

      console.log(`[chat-send] 💾 SAVING ASSISTANT MESSAGE TO DB - message_number: ${nextMessageNumber}`);
      
      const { data: insertData, error: assistantError } = await supabase
        .from("messages")
        .insert(assistantMessageData, {
          onConflict: "client_msg_id",
          ignoreDuplicates: true,
          returning: "minimal"
        });

      if (assistantError) {
        console.error('[chat-send] ❌ FAILED TO SAVE ASSISTANT MESSAGE:', assistantError);
        return new Response(JSON.stringify({
          error: "Failed to save assistant message"
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log(`[chat-send] ✅ ASSISTANT MESSAGE SAVED TO DB SUCCESSFULLY - message_number: ${nextMessageNumber}, insertData:`, insertData);
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
      message_number: nextMessageNumber,
      meta: {}
    };

    console.log(`[chat-send] 💾 SAVING USER MESSAGE TO DB - message_number: ${nextMessageNumber}`);
    
    const { data: userInsertData, error: userError } = await supabase
      .from("messages")
      .insert(userMessageData, {
        onConflict: "client_msg_id",
        ignoreDuplicates: true,
        returning: "minimal"
      });

    if (userError) {
      console.error('[chat-send] ❌ FAILED TO SAVE USER MESSAGE:', userError);
      return new Response(JSON.stringify({
        error: "Failed to save message"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    console.log(`[chat-send] ✅ USER MESSAGE SAVED TO DB SUCCESSFULLY - message_number: ${nextMessageNumber}, insertData:`, userInsertData);

    // For conversation mode, just save user message (STT handles LLM call separately)
    if (mode === 'conversation') {
      console.log('[chat-send] 💬 CONVERSATION MODE: User message saved, no LLM call needed');
      return new Response(JSON.stringify({
        message: "User message saved successfully",
        user_message: userMessageData
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // (Assistant path handled above)

    // For non-conversation: Fire-and-forget LLM call; LLM will save assistant via chat-send
    console.log(`[chat-send] 🤖 CALLING LLM HANDLER - chat_id: ${chat_id}`);
    fetch(`${SUPABASE_URL}/functions/v1/llm-handler-openai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        chat_id,
        text: text
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
