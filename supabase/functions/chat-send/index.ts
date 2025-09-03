//

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

    // 🚫 IDEMPOTENCY CHECK: Prevent duplicate processing of the same message
    const existingMessage = await supabase
      .from("messages")
      .select("id, role, text, status")
      .eq("client_msg_id", client_msg_id || crypto.randomUUID())
      .eq("chat_id", chat_id)
      .single();

    if (existingMessage && existingMessage.status === "complete") {
      console.log('[chat-send] 🚫 Idempotency: Message already processed, skipping duplicate call');
      return new Response(JSON.stringify({
        message: "Message already processed",
        client_msg_id: client_msg_id || crypto.randomUUID(),
        existing_message: existingMessage
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

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

    // 🎯 CONVERSATION MODE: Orchestrate the full flow
    if (mode === 'conversation') {
      try {
        console.log('[chat-send] 🎤 Starting conversation mode orchestration');
        
        // 🚫 CONVERSATION IDEMPOTENCY: Check if we already have an assistant response for this user message
        const existingAssistantMessage = await supabase
          .from("messages")
          .select("id, text, meta")
          .eq("chat_id", chat_id)
          .eq("role", "assistant")
          .eq("meta->>user_message_id", userMessageData.client_msg_id)
          .single();

        if (existingAssistantMessage) {
          console.log('[chat-send] 🚫 Conversation idempotency: Assistant response already exists, skipping LLM/TTS');
          return new Response(JSON.stringify({
            message: "Conversation already processed",
            text: existingAssistantMessage.text,
            client_msg_id: userMessageData.client_msg_id,
            existing_assistant: existingAssistantMessage
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        // Step 2: Call LLM handler to get assistant response
        console.log('[chat-send] 🤖 Calling LLM handler...');
        const llmResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/llm-handler-openai`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
          },
          body: JSON.stringify({
            chat_id,
            text: text,
            client_msg_id: client_msg_id || userMessageData.client_msg_id,
            mode: 'conversation'
          })
        });

        if (!llmResponse.ok) {
          const errorText = await llmResponse.text();
          console.error('[chat-send] ❌ LLM handler failed:', errorText);
          throw new Error(`LLM handler failed: ${llmResponse.status}`);
        }

        const llmData = await llmResponse.json();
        const assistantText = llmData.text;
        
        if (!assistantText) {
          console.error('[chat-send] ❌ No assistant text received from LLM');
          throw new Error('No assistant response received');
        }

        console.log('[chat-send] ✅ LLM response received, length:', assistantText.length);

        // Step 3: Save assistant message to DB
        const assistantMessageData = {
          chat_id,
          role: "assistant",
          text: assistantText,
          client_msg_id: crypto.randomUUID(),
          status: "complete",
          meta: { 
            mode: 'conversation',
            user_message_id: userMessageData.client_msg_id  // 🔗 Link to user message for idempotency
          }
        };

        console.log('[chat-send] 💾 Saving assistant message to DB...');
        const { error: assistantError } = await supabase
          .from("messages")
          .upsert(assistantMessageData, {
            onConflict: "client_msg_id"
          });

        if (assistantError) {
          console.error('[chat-send] ❌ Assistant message save failed:', assistantError);
          // Continue anyway - we can still return the response
        } else {
          console.log('[chat-send] ✅ Assistant message saved to DB');
        }

        // Step 4: Call TTS to generate audio
        console.log('[chat-send] 🎵 Calling TTS service...');
        const ttsResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-text-to-speech`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
          },
          body: JSON.stringify({
            text: assistantText,
            voice: 'Puck',
            chat_id: chat_id
          })
        });

        if (!ttsResponse.ok) {
          const errorText = await ttsResponse.text();
          console.error('[chat-send] ❌ TTS service failed:', errorText);
          // Return response without audio - user can still see the text
          return new Response(JSON.stringify({
            message: "Assistant response ready",
            text: assistantText,
            client_msg_id: userMessageData.client_msg_id
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const ttsData = await ttsResponse.json();
        const audioUrl = ttsData.audioUrl;
        
        console.log('[chat-send] ✅ TTS completed, audioUrl:', audioUrl);

        // Step 5: TTS makes the phone call directly - just return response
        const responseData = {
          message: "Assistant response ready",
          text: assistantText,
          client_msg_id: userMessageData.client_msg_id
        };

        console.log('[chat-send] 🚀 Returning response to browser (TTS makes phone call)');
        return new Response(JSON.stringify(responseData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (error) {
        console.error('[chat-send] ❌ Conversation mode error:', error);
        return new Response(JSON.stringify({
          error: `Conversation mode failed: ${error.message}`,
          client_msg_id: userMessageData.client_msg_id
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
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
            client_msg_id: client_msg_id || userMessageData.client_msg_id,
            mode,
            sessionId
          })
        });

        if (!llmResponse.ok) {
          const errorText = await llmResponse.text();
          console.error('[chat-send] Background LLM processing failed:', errorText);
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
