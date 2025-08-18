// supabase/functions/llm-handler/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const GOOGLE_API_KEY = Deno.env.get("GOOGLE-API-ONE")
  ?? Deno.env.get("GOOGLE_API_ONE")
  ?? Deno.env.get("GOOGLE_API_KEY")
  ?? "";

const GOOGLE_MODEL = "gemini-2.5-flash";
const GOOGLE_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin'
};

// We'll create the Supabase client per-request with forwarded auth

// No inline context injection here. Context should be pre-seeded as a message
// with meta.type = 'context_injection' or 'context_preseeded'.

serve(async (req) => {
  console.log("[llm-handler] Received request");

  if (req.method === "OPTIONS") {
    console.log("[llm-handler] Handling OPTIONS request");
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // Create per-request Supabase client with forwarded auth
    const authHeader = req.headers.get('authorization');
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    const { conversationId, userMessage } = await req.json();

    if (!conversationId || !userMessage) {
      throw new Error("Missing 'conversationId' or 'userMessage' in request body.");
    }
    
    // 1. Fire-and-forget insert of the user's message (do not await)
    console.log("[llm-handler] Queueing user message INSERT for conversation:", conversationId);
    const messageInsertData = {
      conversation_id: conversationId,
      role: 'user',
      text: userMessage.text,
      meta: userMessage.meta || {},
    };
    EdgeRuntime?.waitUntil?.(
      supabaseAdmin
        .from('messages')
        .insert(messageInsertData)
        .then(
          () => console.log('[llm-handler] User message insert completed.'),
          (err) => console.error('[llm-handler] User message insert failed:', err)
        )
    );

    // 2. Fetch compact turn bundle: latest context + last 12 non-context messages
    console.log("[llm-handler] Fetching compact conversation bundle from DB.");
    const [{ data: contextMsg }, { data: recentMsgs, error: recentErr }] = await Promise.all([
      supabaseAdmin
        .from('messages')
        .select('role, text, created_at')
        .eq('conversation_id', conversationId)
        .in('meta->>type', ['context_injection', 'context_preseeded'])
        .order('created_at', { ascending: false })
        .limit(1),
      supabaseAdmin
        .from('messages')
        .select('role, text, created_at, meta')
        .eq('conversation_id', conversationId)
        .or("meta->>type.is.null,not(meta->>type).in.(context_injection,context_preseeded)")
        .order('created_at', { ascending: false })
        .limit(12)
    ]);

    if (recentErr) {
      console.error("[llm-handler] Error fetching compact bundle:", recentErr);
      throw new Error(`Failed to fetch compact bundle: ${recentErr.message}`);
    }

    const messages = (recentMsgs ?? []).reverse();
    const compactContext = contextMsg && contextMsg.length > 0 ? contextMsg[0].text : "";

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
    const contents = [] as any[];
    
    // Add system prompt as first user message
    contents.push({
      role: "user",
      parts: [{ text: systemPrompt }]
    });
    
    // Add compact context if available
    if (compactContext && compactContext.trim().length > 0) {
      contents.push({
        role: "user",
        parts: [{ text: `Context (report):\n${compactContext}` }]
      });
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

    // 4. Fire-and-forget insert of the assistant's message and return immediately
    console.log("[llm-handler] Queueing assistant message INSERT for conversation:", conversationId);
    const provisionalId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const assistantMessageInsertData = {
      conversation_id: conversationId,
      role: 'assistant',
      text: assistantResponseText,
      meta: { llm_provider: "google", model: GOOGLE_MODEL },
    };
    EdgeRuntime?.waitUntil?.(
      supabaseAdmin
        .from('messages')
        .insert(assistantMessageInsertData)
        .then(
          () => console.log('[llm-handler] Assistant message insert completed.'),
          (err) => console.error('[llm-handler] Assistant message insert failed:', err)
        )
    );

    // Return a provisional message immediately without waiting for DB roundtrip
    console.log("[llm-handler] Returning provisional assistant message to client.");
    const provisionalMessage = {
      id: provisionalId,
      conversation_id: conversationId,
      role: 'assistant',
      text: assistantResponseText,
      meta: { llm_provider: 'google', model: GOOGLE_MODEL, provisional: true },
      created_at: createdAt,
    };
    return new Response(JSON.stringify(provisionalMessage), {
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
