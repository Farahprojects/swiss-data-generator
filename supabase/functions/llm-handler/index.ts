// supabase/functions/llm-handler/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
// Use anon key for least privilege; caller's Authorization will be forwarded per-request
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("PUBLIC_SUPABASE_ANON_KEY") ??
  "";
const GOOGLE_API_KEY = Deno.env.get("GOOGLE-API-ONE")
  ?? Deno.env.get("GOOGLE_API_ONE")
  ?? Deno.env.get("GOOGLE_API_KEY")
  ?? "";

const GOOGLE_MODEL = "gemini-2.5-flash";
const GOOGLE_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-trace-id',
  'Vary': 'Origin',
};

// Defer client creation to each request so we can forward caller Authorization

function buildFullContext(d: any): string {
  const report = d?.report_content || "";
  const swiss = d?.swiss_data ? JSON.stringify(d.swiss_data) : "";
  const meta = d?.metadata ? JSON.stringify(d.metadata) : "";
  const parts: string[] = [];
  if (report) parts.push(`Report:\n${report}`);
  if (swiss) parts.push(`SwissData:\n${swiss}`);
  if (meta) parts.push(`Metadata:\n${meta}`);
  return parts.join("\n\n").trim();
}

serve(async (req) => {
  const reqHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => { reqHeaders[key.toLowerCase()] = value; });
  console.log("[llm-handler] Received request", {
    origin: reqHeaders['origin'] || null,
    referer: reqHeaders['referer'] || null,
    contentType: reqHeaders['content-type'] || null,
    xRequestId: reqHeaders['x-request-id'] || null,
    xTraceId: reqHeaders['x-trace-id'] || null,
  });

  if (req.method === "OPTIONS") {
    console.log("[llm-handler] Handling OPTIONS request");
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // Build a per-request Supabase client using anon key and forward Authorization if present
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: reqHeaders['authorization']
          ? { Authorization: reqHeaders['authorization'] }
          : {},
      },
    });
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
    
    const { data: newUserMessage, error: userMessageError } = await supabase
      .from('messages')
      .insert(messageInsertData)
      .select()
      .single();

    if (userMessageError) {
      console.error("[llm-handler] Error saving user message:", userMessageError);
      throw new Error(`Failed to save user message: ${userMessageError.message}`);
    }
    console.log("[llm-handler] User message saved successfully.");

    // 2. Fetch the minimal turn bundle (context + summary + last N messages)
    // Assumes `conversations` has optional `context_json` and `conversation_summary` columns.
    // If not present, this SELECT will still work with nulls.
    const { data: turnBundle, error: turnError } = await supabase
      .from('conversations')
      .select(`
        context_json,
        conversation_summary,
        messages:messages!inner(role, text)
      `)
      .eq('id', conversationId)
      .order('created_at', { foreignTable: 'messages', ascending: true })
      .limit(1000);
    if (turnError) {
      throw new Error(`Failed to fetch turn bundle: ${turnError.message}`);
    }

    // 3. Prepare the minimal message context
    const contextJson = turnBundle?.[0]?.context_json || null;
    const conversationSummary = turnBundle?.[0]?.conversation_summary || null;
    const messages = Array.isArray(turnBundle?.[0]?.messages) ? turnBundle![0]!.messages : [];

    // 4. Call Google Gemini API
    const systemPrompt = `You are an expert astrological analyst and interpreter. Your role is to help users understand their astrological data and reports.

ANALYSIS FRAMEWORK:
1. DATA IDENTIFICATION
   - Always specify which parts of the Swiss data or report you are using
   - Quote relevant positions, aspects, or interpretations
   - Explain why these data points are significant for the question

2. TRANSPARENT REASONING
   - Show how you connect the astrological data to your insights
   - Explain any assumptions or traditional interpretations you're using
   - Highlight where multiple interpretations might be valid

3. CLEAR RESPONSE
   - After showing your work, provide a clear, direct answer
   - Use accessible language while preserving astrological accuracy
   - Acknowledge any limitations in the data or interpretation

FORMAT:
📊 Data Points:
[List the specific Swiss data or report sections you're using]

🔍 Analysis:
[Show your reasoning and connections]

💡 Answer:
[Give the clear, final response]

Remember: Always be transparent about your analytical process and maintain a balance between technical accuracy and accessibility.`;


    // Convert conversation to Google Gemini format
    const contents = [];
    
    // Add system prompt as first user message
    contents.push({
      role: "user",
      parts: [{ text: systemPrompt }]
    });
    
    // Add pre-seeded context if available
    if (contextJson) {
      contents.push({ role: 'user', parts: [{ text: `Context (preseeded):\n${JSON.stringify(contextJson)}` }] });
    }
    if (conversationSummary) {
      contents.push({ role: 'user', parts: [{ text: `Summary:\n${conversationSummary}` }] });
    }

    // Add conversation messages
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      });
    }
    
    const requestBody = {
      contents: contents,
      generationConfig: {
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        temperature: 0.7
      }
    };

    const apiUrl = `${GOOGLE_ENDPOINT}?key=${GOOGLE_API_KEY}`;
    console.log(`[llm-handler] Sending request to Google Gemini with ${contents.length} messages.`);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const assistantResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!assistantResponseText) {
      console.error(`[llm-handler] Gemini response missing content:`, data);
      throw new Error("Gemini response did not contain expected content");
    }
    
    console.log("[llm-handler] Received successful response from Google Gemini.");

    // 4. Save the assistant's message
    console.log("[llm-handler] Inserting assistant message into DB with conversation_id:", conversationId);
    const assistantMessageInsertData = {
      conversation_id: conversationId,
      role: 'assistant',
      text: assistantResponseText,
      meta: { llm_provider: "google", model: GOOGLE_MODEL },
    };
    console.log("[llm-handler] Assistant message INSERT data:", JSON.stringify(assistantMessageInsertData));
    
    const { data: newAssistantMessage, error: assistantMessageError } = await supabase
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
