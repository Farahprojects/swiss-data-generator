// try

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  console.log(`[chat-send] Received ${req.method} request`);

  if (req.method === 'OPTIONS') {
    console.log('[chat-send] Handling OPTIONS request');
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
    console.log('[chat-send] Request body:', body);
    
    const { chat_id, text, client_msg_id, mode, sessionId } = body;

    if (!chat_id || !text) {
      console.error('[chat-send] Missing required fields');
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
    console.log('[chat-send] Supabase client created');
    
    // Note: chat_id is already verified by verify-chat-access edge function
    // No additional validation needed here



    // Save message to DB (fire and forget)
    const userMessageData = {
      chat_id,
      role: "user",
      text: text, // Save original text to DB
      client_msg_id: client_msg_id || crypto.randomUUID(),
      status: "complete",
      meta: {}
    };

    console.log('[chat-send] Inserting user message:', userMessageData);
    const { error: userError } = await supabase
      .from("messages")
      .upsert(userMessageData, {
        onConflict: "client_msg_id"
      });

    if (userError) {
      console.error('[chat-send] User message insert failed:', userError);
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
    console.log('[chat-send] User message inserted');

    // 🎯 CONVERSATION MODE: Call LLM handler (fire-and-forget)
    if (mode === 'conversation') {
      console.log('[chat-send] 🎤 Starting conversation mode - calling LLM handler...');
      
      // Fire-and-forget LLM call - llm-handler-openai will handle TTS and DB save
      EdgeRuntime.waitUntil(
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/llm-handler-openai`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
          },
          body: JSON.stringify({
            chat_id,
            text: text,
            mode: mode
          })
        }).then(async (llmResponse) => {
          if (!llmResponse.ok) {
            const errorText = await llmResponse.text();
            console.error('[chat-send] ❌ LLM handler failed:', errorText);
          } else {
            console.log('[chat-send] ✅ LLM handler completed in background');
          }
        }).catch((error) => {
          console.error('[chat-send] ❌ LLM handler error:', error);
        })
      );

      // Return immediate response - LLM handler will handle the rest
      const responseData = {
        message: "Message saved, processing assistant response",
        client_msg_id: userMessageData.client_msg_id
      };
      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // For non-conversation modes, use the old fire-and-forget approach
    const processLLMResponse = async () => {
      try {
        console.log('[chat-send] Starting background LLM processing');
        
        const llmResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/llm-handler-openai`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
          },
          body: JSON.stringify({
            chat_id,
            text: text,
            mode: mode
          })
        });

        if (!llmResponse.ok) {
          const errorText = await llmResponse.text();
          console.error('[chat-send] Background LLM processing failed:', errorText);
          return;
        }

        const llmData = await llmResponse.json();
        const { text: assistantText, usage, latency_ms } = llmData;

        if (!assistantText) {
          console.error('[chat-send] ❌ No assistant text received from background LLM');
          return;
        }

        // Save assistant message to DB
        const assistantMessageData = {
          chat_id,
          role: "assistant",
          text: assistantText,
          client_msg_id: crypto.randomUUID(),
          status: "complete",
          meta: { 
            llm_provider: "openai", 
            model: "gpt-4.1-mini-2025-04-14",
            latency_ms,
            input_tokens: usage?.input_tokens,
            output_tokens: usage?.output_tokens,
            total_tokens: usage?.total_tokens,
            mode: mode || 'background'
          }
        };

        const { error: assistantError } = await supabase
          .from("messages")
          .upsert(assistantMessageData, {
            onConflict: "client_msg_id"
          });

        if (assistantError) {
          console.error('[chat-send] Background assistant message save failed:', assistantError);
        } else {
          console.log('[chat-send] Background LLM processing completed');
        }
      } catch (error) {
        console.error('[chat-send] Background LLM processing error:', error);
      }
    };

    // Start background processing without awaiting
    EdgeRuntime.waitUntil(processLLMResponse());

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
    console.error('[chat-send] Error:', error);
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
