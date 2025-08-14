// supabase/functions/llm-handler/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY } from "../_shared/config.ts";

const OPENAI_MODEL = "gpt-4o";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  console.log("[llm-handler] Received request");

  if (req.method === "OPTIONS") {
    console.log("[llm-handler] Handling OPTIONS request");
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { conversationId, userMessage } = await req.json();

    if (!conversationId || !userMessage) {
      throw new Error("Missing 'conversationId' or 'userMessage' in request body.");
    }
    
    // 1. Save the user's message first
    console.log("[llm-handler] Inserting user message into DB with conversation_id:", conversationId);
    const messageInsertData = {
      conversation_id: conversationId,
      role: 'user',
      text: userMessage.text,
      meta: userMessage.meta || {},
    };
    console.log("[llm-handler] Message INSERT data:", JSON.stringify(messageInsertData));
    
    const { data: newUserMessage, error: userMessageError } = await supabaseAdmin
      .from('messages')
      .insert(messageInsertData)
      .select()
      .single();

    if (userMessageError) {
      console.error("[llm-handler] Error saving user message:", userMessageError);
      throw new Error(`Failed to save user message: ${userMessageError.message}`);
    }
    console.log("[llm-handler] User message saved successfully.");

    // 2. Fetch the conversation history
    console.log("[llm-handler] Fetching conversation history from DB.");
    const { data: messages, error: historyError } = await supabaseAdmin
      .from('messages')
      .select('role, text')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error("[llm-handler] Error fetching conversation history:", historyError);
      throw new Error(`Failed to fetch conversation history: ${historyError.message}`);
    }

    // 3. Call OpenAI API
    const systemPrompt = { role: "system", content: "You are a helpful assistant." };
    const apiMessages = messages.map(msg => ({ role: msg.role, content: msg.text }));
    
    const requestBody = {
      model: OPENAI_MODEL,
      messages: [systemPrompt, ...apiMessages],
      temperature: 0.7,
    };

    console.log(`[llm-handler] Sending request to OpenAI with ${apiMessages.length} messages.`);
    const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const assistantResponseText = data.choices[0].message.content;
    console.log("[llm-handler] Received successful response from OpenAI.");

    // 4. Save the assistant's message
    console.log("[llm-handler] Inserting assistant message into DB with conversation_id:", conversationId);
    const assistantMessageInsertData = {
      conversation_id: conversationId,
      role: 'assistant',
      text: assistantResponseText,
      meta: { llm_provider: "openai", model: OPENAI_MODEL },
    };
    console.log("[llm-handler] Assistant message INSERT data:", JSON.stringify(assistantMessageInsertData));
    
    const { data: newAssistantMessage, error: assistantMessageError } = await supabaseAdmin
      .from('messages')
      .insert(assistantMessageInsertData)
      .select()
      .single();

    if (assistantMessageError) {
      console.error("[llm-handler] Error saving assistant message:", assistantMessageError);
      throw new Error(`Failed to save assistant message: ${assistantMessageError.message}`);
    }

    // 5. Return the newly created assistant message
    console.log("[llm-handler] Assistant message saved. Returning to client.");
    return new Response(JSON.stringify(newAssistantMessage), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("[llm-handler] An unexpected error occurred:", err);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
