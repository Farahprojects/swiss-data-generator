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
    const { chat_id, text, client_msg_id, mode, sessionId } = body;

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

    // Save message to DB (fire and forget)
    const userMessageData = {
      chat_id,
      role: "user",
      text: text,
      client_msg_id: client_msg_id || crypto.randomUUID(),
      status: "complete",
      message_number: nextMessageNumber,
      meta: {}
    };

    const { error: userError } = await supabase
      .from("messages")
      .insert(userMessageData, {
        onConflict: "client_msg_id",
        ignoreDuplicates: true,
        returning: "minimal"
      });

    if (userError) {
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

    // For conversation mode, just save user message (STT handles LLM call separately)
    if (mode === 'conversation') {
      console.log('[chat-send] Conversation mode: User message saved');
      return new Response(JSON.stringify({
        message: "User message saved successfully",
        user_message: userMessageData
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // For assistant messages (from LLM), just save to DB
    if (role === 'assistant') {
      const assistantMessageData = {
        chat_id,
        role: "assistant",
        text: text,
        client_msg_id: client_msg_id || crypto.randomUUID(),
        status: "complete",
        message_number: nextMessageNumber,
        meta: {}
      };

      const { error: assistantError } = await supabase
        .from("messages")
        .insert(assistantMessageData, {
          onConflict: "client_msg_id",
          ignoreDuplicates: true,
          returning: "minimal"
        });

      if (assistantError) {
        console.error('[chat-send] Failed to save assistant message:', assistantError);
        return new Response(JSON.stringify({
          error: "Failed to save assistant message"
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log('[chat-send] Assistant message saved');
      return new Response(JSON.stringify({
        message: "Assistant message saved successfully",
        assistant_message: assistantMessageData
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // For non-conversation modes, call LLM handler and save assistant response
    try {
      const llmResponse = await fetch(`${SUPABASE_URL}/functions/v1/llm-handler-openai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          chat_id,
          text: text,
          mode: mode
        })
      });

      if (!llmResponse.ok) {
        console.error('[chat-send] LLM handler failed:', llmResponse.status, llmResponse.statusText);
        return new Response(JSON.stringify({
          error: "Failed to process message with LLM"
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const llmData = await llmResponse.json();
      const { assistantMessageData } = llmData;

      if (assistantMessageData) {
        // Get the next message number for this chat using the database function
        const { data: assistantMessageNumber, error: assistantNumberError } = await supabase
          .rpc('get_next_message_number', { p_chat_id: chat_id });

        if (assistantNumberError) {
          console.error('[chat-send] Failed to get assistant message number:', assistantNumberError);
          return new Response(JSON.stringify({
            error: "Failed to get message number for assistant response"
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const assistantMessageWithNumber = {
          ...assistantMessageData,
          message_number: assistantMessageNumber
        };

        const { error: assistantError } = await supabase
          .from("messages")
          .insert(assistantMessageWithNumber, {
            onConflict: "client_msg_id",
            ignoreDuplicates: true,
            returning: "minimal"
          });

        if (assistantError) {
          console.error('[chat-send] Failed to save assistant message:', assistantError);
          return new Response(JSON.stringify({
            error: "Failed to save assistant response"
          }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        console.log('[chat-send] Successfully saved user and assistant messages');
      }

      // Return success response
      return new Response(JSON.stringify({
        message: "Message processed successfully",
        user_message: userMessageData,
        assistant_saved: !!assistantMessageData
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (error) {
      console.error('[chat-send] Error processing LLM response:', error);
      return new Response(JSON.stringify({
        error: "Failed to process message"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

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
