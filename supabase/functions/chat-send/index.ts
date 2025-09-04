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

    // 🎯 CONVERSATION MODE: Orchestrate the full flow
    if (mode === 'conversation') {
      try {
        console.log('[chat-send] 🎤 Starting conversation mode orchestration');
        

        
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

        // 🚫 COMMENTED OUT: Assistant message save (handled by llm-handler-openai)
        // const assistantMessageData = {
        //   chat_id,
        //   role: "assistant",
        //   text: assistantText,
        //   client_msg_id: crypto.randomUUID(),
        //   status: "complete",
        //   meta: { 
        //     mode: 'conversation'
        //   }
        // };

        // console.log('[chat-send] 💾 Saving assistant message to DB...');
        // const { error: assistantError } = await supabase
        //   .from("messages")
        //   .upsert(assistantMessageData, {
        //     onConflict: "client_msg_id"
        //   });

        // if (assistantError) {
        //   console.error('[chat-send] ❌ Assistant message save failed:', assistantError);
        //   // Continue anyway - we can still return the response
        // } else {
        //   console.log('[chat-send] ✅ Assistant message saved to DB');
        // }

        // Step 4: Call TTS to generate audio (fire-and-forget)
        console.log('[chat-send] 🎵 Starting TTS service (fire-and-forget)...');
        EdgeRuntime.waitUntil(
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/google-text-to-speech`, {
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
          }).then(async (ttsResponse) => {
            if (!ttsResponse.ok) {
              const errorText = await ttsResponse.text();
              console.error('[chat-send] ❌ TTS service failed:', errorText);
            } else {
              console.log('[chat-send] ✅ TTS completed in background');
            }
          }).catch((error) => {
            console.error('[chat-send] ❌ TTS service error:', error);
          })
        );

        // Step 5: Return response immediately - TTS will make phone call when ready
        const responseData = {
          message: "Assistant response ready",
          text: assistantText,
          client_msg_id: userMessageData.client_msg_id
        };
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
