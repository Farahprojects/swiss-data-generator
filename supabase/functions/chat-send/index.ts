import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  console.log(`[chat-send] Received ${req.method} request`);

  if (req.method === 'OPTIONS') {
    console.log('[chat-send] Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[chat-send] Request body:', body);
    
    const { chat_id, guest_id, text, client_msg_id, k = 30 } = body;
    
    if (!chat_id || !guest_id || !text) {
      console.error('[chat-send] Missing required fields');
      return new Response(JSON.stringify({ error: "Missing required fields: chat_id, guest_id, text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );
    console.log('[chat-send] Supabase client created');

    // Validate guest_id ↔ chat_id mapping
    console.log('[chat-send] Validating guest_id and chat_id mapping');
    const { data: guestReport, error: validationError } = await supabase
      .from('guest_reports')
      .select('id')
      .eq('id', guest_id)
      .eq('chat_id', chat_id)
      .single();

    if (validationError || !guestReport) {
      console.error('[chat-send] Validation failed:', validationError);
      return new Response(JSON.stringify({ error: "Invalid chat or guest" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log('[chat-send] Validation successful');

    // Check for streaming request
    const acceptHeader = req.headers.get('accept');
    const isStreaming = acceptHeader?.includes('text/event-stream');
    
    if (isStreaming) {
      console.log('[chat-send] Starting streaming response');
      
      // Create a readable stream for SSE
      const stream = new ReadableStream({
        start(controller) {
          (async () => {
            try {
              // Insert user message
              const userMessageData = {
                chat_id,
                role: "user",
                text,
                client_msg_id: client_msg_id || crypto.randomUUID(),
                status: "complete",
                meta: {}
              };
              console.log('[chat-send] Inserting user message:', userMessageData);

              const { data: userMessage, error: userError } = await supabase
                .from("messages")
                .upsert(userMessageData, { onConflict: "client_msg_id" })
                .select("id")
                .single();

              if (userError) {
                console.error('[chat-send] User message insert failed:', userError);
                controller.enqueue(`data: ${JSON.stringify({ error: "Failed to save message" })}\n\n`);
                controller.close();
                return;
              }
              console.log('[chat-send] User message inserted:', userMessage);

              // Insert provisional assistant message
              const assistantMessageData = {
                chat_id,
                role: "assistant",
                text: "",
                status: "streaming",
                model: "gemini-2.5-flash",
                meta: {}
              };
              console.log('[chat-send] Inserting provisional assistant message');

              const { data: assistantMessage, error: assistantError } = await supabase
                .from("messages")
                .insert(assistantMessageData)
                .select("id")
                .single();

              if (assistantError) {
                console.error('[chat-send] Assistant message insert failed:', assistantError);
                controller.enqueue(`data: ${JSON.stringify({ error: "Failed to create assistant message" })}\n\n`);
                controller.close();
                return;
              }
              console.log('[chat-send] Assistant message inserted:', assistantMessage);

              // Get recent messages for context
              const { data: messages, error: historyError } = await supabase
                .from('messages')
                .select('role, text')
                .eq('chat_id', chat_id)
                .order('created_at', { ascending: true })
                .limit(k);

              if (historyError) {
                console.error('[chat-send] Failed to fetch message history:', historyError);
              }

              // Build conversation history
              const conversationHistory = messages?.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.text }]
              })) || [];

              // Add the new user message to history
              conversationHistory.push({
                role: 'user',
                parts: [{ text }]
              });

              console.log('[chat-send] Starting LLM stream with history length:', conversationHistory.length);

              // Call Gemini API
              const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
              if (!GOOGLE_API_KEY) {
                console.error('[chat-send] Missing GOOGLE_API_KEY');
                controller.enqueue(`data: ${JSON.stringify({ error: "LLM service unavailable" })}\n\n`);
                controller.close();
                return;
              }

              const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${GOOGLE_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: conversationHistory,
                  generationConfig: {
                    maxOutputTokens: 2048,
                    temperature: 0.7
                  }
                })
              });

              if (!geminiResponse.ok) {
                const errorText = await geminiResponse.text();
                console.error('[chat-send] Gemini API error:', errorText);
                controller.enqueue(`data: ${JSON.stringify({ error: "LLM call failed" })}\n\n`);
                controller.close();
                return;
              }

              const reader = geminiResponse.body?.getReader();
              if (!reader) {
                console.error('[chat-send] No response body reader');
                controller.enqueue(`data: ${JSON.stringify({ error: "No response stream" })}\n\n`);
                controller.close();
                return;
              }

              let accumulatedText = '';
              const startTime = Date.now();

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.slice(6));
                      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                        const deltaText = data.candidates[0].content.parts[0].text;
                        accumulatedText += deltaText;
                        
                        // Stream delta to client
                        controller.enqueue(`data: ${JSON.stringify({ delta: deltaText })}\n\n`);
                      }
                    } catch (parseError) {
                      console.error('[chat-send] Parse error:', parseError);
                    }
                  }
                }
              }

              // Finalize assistant message
              const latencyMs = Date.now() - startTime;
              console.log('[chat-send] Finalizing assistant message with text length:', accumulatedText.length);

              const { error: finalizeError } = await supabase
                .from('messages')
                .update({
                  text: accumulatedText,
                  status: 'complete',
                  latency_ms: latencyMs
                })
                .eq('id', assistantMessage.id);

              if (finalizeError) {
                console.error('[chat-send] Failed to finalize assistant message:', finalizeError);
              } else {
                console.log('[chat-send] Assistant message finalized successfully');
              }

              // Send completion signal
              controller.enqueue(`data: ${JSON.stringify({ done: true, assistant_message_id: assistantMessage.id, latency_ms: latencyMs })}\n\n`);
              controller.close();

            } catch (error) {
              console.error('[chat-send] Stream error:', error);
              controller.enqueue(`data: ${JSON.stringify({ error: error.message })}\n\n`);
              controller.close();
            }
          })();
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    } else {
      // Non-streaming JSON response
      console.log('[chat-send] Processing non-streaming request');
      
      // For now, return a simple acknowledgment
      // Full implementation would do the same flow but wait for completion
      return new Response(JSON.stringify({ message: "Chat processing started" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error('[chat-send] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});