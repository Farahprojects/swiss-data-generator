// supabase/functions/llm-handler/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GOOGLE_API_KEY = Deno.env.get("GOOGLE-API-ONE")
  ?? Deno.env.get("GOOGLE_API_ONE")
  ?? Deno.env.get("GOOGLE_API_KEY")
  ?? "";

const GOOGLE_MODEL = "gemini-2.5-flash";
const GOOGLE_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

async function checkReportReady(guestId: string): Promise<boolean> {
  console.log("[llm-handler] Checking if report is ready for:", guestId);
  
  try {
    const { data, error } = await supabaseAdmin
      .from('report_ready_signals')
      .select('guest_report_id')
      .eq('guest_report_id', guestId)
      .limit(1);
    
    if (error) {
      console.warn("[llm-handler] Error checking report ready:", error);
      return false;
    }
    
    const isReady = !!(data && data.length > 0);
    console.log(`[llm-handler] Report ready status: ${isReady}`);
    return isReady;
  } catch (error) {
    console.warn("[llm-handler] Exception checking report ready:", error);
    return false;
  }
}

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

    // 2. Fetch conversation meta (guest_id + context_injected)
    const { data: conv, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('guest_id, context_injected')
      .eq('id', conversationId)
      .single();
    if (convError) {
      throw new Error(`Failed to fetch conversation: ${convError.message}`);
    }

    const guestId = conv?.guest_id as string | undefined;
    let contextInjected = !!conv?.context_injected;

    // Try to attach compact context once if not yet injected
    let compactContext = "";
    if (!contextInjected && guestId) {
      const ready = await checkReportReady(guestId);
      if (ready) {
        console.log("[llm-handler] Report ready, fetching report data for context injection");
        const getResp = await supabaseAdmin.functions.invoke('get-report-data', {
          body: { guest_report_id: guestId }
        });
        
        console.log("[llm-handler] get-report-data response:", {
          hasError: !!getResp.error,
          dataOk: getResp.data?.ok,
          dataReady: getResp.data?.ready,
          hasData: !!getResp.data?.data
        });
        
        if (!getResp.error && getResp.data?.ok && getResp.data?.ready) {
          compactContext = buildFullContext(getResp.data.data);
          console.log("[llm-handler] Built context, length:", compactContext.length);
          // Persist context into messages table once (dedupe by meta.type)
          try {
            const { data: existingCtx, error: checkCtxErr } = await supabaseAdmin
              .from('messages')
              .select('id')
              .eq('conversation_id', conversationId)
              .contains('meta', { type: 'context_injection' })
              .limit(1);
            if (!checkCtxErr && (!existingCtx || existingCtx.length === 0)) {
              await supabaseAdmin.from('messages').insert({
                conversation_id: conversationId,
                role: 'user',
                text: compactContext,
                meta: { type: 'context_injection', source: 'server', injected_at: new Date().toISOString() },
              });
            }
          } catch (_e) {
            // non-fatal
          }
          // Mark conversation as having context injected
          await supabaseAdmin
            .from('conversations')
            .update({ context_injected: true })
            .eq('id', conversationId);
          
          // Mark report as seen now that context has been successfully injected
          try {
            await supabaseAdmin
              .from('report_ready_signals')
              .update({ seen: true })
              .eq('guest_report_id', guestId);
            console.log("[llm-handler] Marked report as seen after context injection");
          } catch (seenError) {
            console.warn("[llm-handler] Failed to mark report as seen:", seenError);
          }
          
          contextInjected = true;
          console.log("[llm-handler] Context injection completed successfully");
        } else {
          console.log("[llm-handler] Report data not ready or invalid:", {
            error: getResp.error,
            ok: getResp.data?.ok,
            ready: getResp.data?.ready
          });
        }
      } else {
        console.log("[llm-handler] Report not ready, skipping context injection");
      }
    } else {
      if (contextInjected) {
        console.log("[llm-handler] Context already injected for this conversation");
      } else {
        console.log("[llm-handler] No guestId available for context injection");
      }
    }

    // 3. Fetch the conversation history
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
    
    // Add compact context if available
    if (compactContext) {
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
