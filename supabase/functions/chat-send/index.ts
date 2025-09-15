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

    // 🎯 CONVERSATION MODE: Call LLM handler (fire-and-forget)
    if (mode === 'conversation') {
      // Fire-and-forget LLM call - llm-handler-openai will handle TTS and DB save
      void fetch(`${SUPABASE_URL}/functions/v1/llm-handler-openai`, {
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
      }).then(async (llmResponse) => {
        if (!llmResponse.ok) {
          return;
        }
        const llmData = await llmResponse.json();
        const { assistantMessageData } = llmData;
        
        if (assistantMessageData) {
          // Get the next message number for this chat using the database function
          const { data: assistantMessageNumber, error: assistantNumberError } = await supabase
            .rpc('get_next_message_number', { p_chat_id: chat_id });

          if (assistantNumberError) {
            console.error('[chat-send] Failed to get assistant message number:', assistantNumberError);
            return;
          }

          const assistantMessageWithNumber = {
            ...assistantMessageData,
            message_number: assistantMessageNumber
          };

          await supabase
            .from("messages")
            .insert(assistantMessageWithNumber, {
              onConflict: "client_msg_id",
              ignoreDuplicates: true,
              returning: "minimal"
            });

          console.log('[chat-send] done');
        }
      }).catch(() => {}); // Silent error handling

      // Return immediate response - LLM handler will handle the rest
      return new Response(JSON.stringify({
        message: "Message saved, processing assistant response",
        client_msg_id: userMessageData.client_msg_id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // For non-conversation modes, use fire-and-forget approach
    void fetch(`${SUPABASE_URL}/functions/v1/llm-handler-openai`, {
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
    }).then(async (llmResponse) => {
      if (!llmResponse.ok) {
        return;
      }

      const llmData = await llmResponse.json();
      const { assistantMessageData } = llmData;

      if (!assistantMessageData) {
        return;
      }

      // Get the next message number for this chat using the database function
      const { data: assistantMessageNumber, error: assistantNumberError } = await supabase
        .rpc('get_next_message_number', { p_chat_id: chat_id });

      if (assistantNumberError) {
        console.error('[chat-send] Failed to get assistant message number:', assistantNumberError);
        return;
      }

      const assistantMessageWithNumber = {
        ...assistantMessageData,
        message_number: assistantMessageNumber
      };

      await supabase
        .from("messages")
        .insert(assistantMessageWithNumber, {
          onConflict: "client_msg_id",
          ignoreDuplicates: true,
          returning: "minimal"
        });
      console.log('[chat-send] done');
    }).catch(() => {}); // Silent error handling

    // Return immediate acknowledgment
    return new Response(JSON.stringify({
      message: "Message saved successfully",
      user_message: userMessageData,
      processing: true
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
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
