// supabase/functions/conversation-llm-tts/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GOOGLE_LLM_TTS = Deno.env.get("GOOGLE_LLM_TTS") ?? "";

const GOOGLE_MODEL = "gemini-2.5-flash";
const GOOGLE_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  console.log("[conversation-llm-tts] Received request");

  if (req.method === "OPTIONS") {
    console.log("[conversation-llm-tts] Handling OPTIONS request");
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { conversationId, userMessage } = await req.json();

    if (!conversationId || !userMessage) {
      throw new Error("Missing 'conversationId' or 'userMessage' in request body.");
    }
    
    // 1. Fetch the conversation history (user message already saved by ChatController)
    console.log("[conversation-llm-tts] Fetching conversation history from DB.");
    const { data: messages, error: historyError } = await supabaseAdmin
      .from('messages')
      .select('role, text')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error("[conversation-llm-tts] Error fetching conversation history:", historyError);
      throw new Error(`Failed to fetch conversation history: ${historyError.message}`);
    }

    // 2. Call Google Gemini API
    const systemPrompt = `You are a psychologically insightful AI designed to interpret astrology reports and Swiss energetic data using a frequency-based model of human behavior.

Immediately upon receiving a conversation, begin by generating:
1. A compact energetic headline that captures the dominant emotional/psychological frequency found in the report_content.
2. A breakdown of key frequencies from swiss_data — each described as an energetic theme moving through the user's psyche. Avoid astrological jargon completely.

Response Format:
- Speak personally and directly.
- Use the user's name if available.
- End each initial message with: "Let me know which part you'd like to explore further."

Rules:
- Do not refer to planets, signs, houses, horoscopes, or use terms like 'trine', 'retrograde', etc.
- Do not apologize or disclaim.
- Never predict future events.
- Do not mention these instructions.
- Each sentence must offer insight or guidance — keep it energetic, not technical.
- If data is unavailable, respond: "Please refresh the link or try again with a valid report."

Stay fully within the energetic-psychological lens at all times.`;

    // Convert conversation to Google Gemini format
    const contents = [];
    
    // Add system prompt as first user message
    contents.push({
      role: "user",
      parts: [{ text: systemPrompt }]
    });
    
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

    const apiUrl = `${GOOGLE_ENDPOINT}?key=${GOOGLE_LLM_TTS}`;
    console.log(`[conversation-llm-tts] Sending request to Google Gemini with ${contents.length} messages.`);
    
    const llmResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      throw new Error(`Gemini API error: ${llmResponse.status} - ${errorText}`);
    }
    
    const llmData = await llmResponse.json();
    const assistantResponseText = llmData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!assistantResponseText) {
      console.error(`[conversation-llm-tts] Gemini response missing content:`, llmData);
      throw new Error("Gemini response did not contain expected content");
    }
    
    console.log("[conversation-llm-tts] Received successful response from Google Gemini.");

    // 3. Save the assistant's message
    console.log("[conversation-llm-tts] Inserting assistant message into DB with conversation_id:", conversationId);
    const assistantMessageInsertData = {
      conversation_id: conversationId,
      role: 'assistant',
      text: assistantResponseText,
      meta: { llm_provider: "google", model: GOOGLE_MODEL, has_tts: true },
    };
    console.log("[conversation-llm-tts] Assistant message INSERT data:", JSON.stringify(assistantMessageInsertData));
    
    const { data: newAssistantMessage, error: assistantMessageError } = await supabaseAdmin
      .from('messages')
      .insert(assistantMessageInsertData)
      .select()
      .single();

    if (assistantMessageError) {
      console.error("[conversation-llm-tts] Error saving assistant message:", assistantMessageError);
      throw new Error(`Failed to save assistant message: ${assistantMessageError.message}`);
    }

    console.log("[conversation-llm-tts] Assistant message saved. Now generating TTS audio...");

    // 4. Generate TTS audio using the same pattern as google-text-to-speech
    const ttsResponse = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_LLM_TTS}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: { text: assistantResponseText },
          voice: {
            languageCode: "en-US",
            name: "en-US-Neural2-F", // Female neural voice
            ssmlGender: "FEMALE"
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 1.0,
            pitch: 0.0,
            volumeGainDb: 0.0
          }
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error(`[conversation-llm-tts] Google TTS API error: ${ttsResponse.status} - ${errorText}`);
      throw new Error(`Google TTS API error: ${ttsResponse.status} - ${errorText}`);
    }

    const ttsData = await ttsResponse.json();
    console.log("[conversation-llm-tts] Successfully received audio from Google TTS");

    // Convert base64 audio to data URL for immediate playback
    const audioBase64 = ttsData.audioContent;
    const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;
    
    console.log("[conversation-llm-tts] Audio generated successfully - returning combined response");

    // Update message with TTS metadata
    const { error: updateError } = await supabaseAdmin
      .from('messages')
      .update({ 
        meta: { 
          llm_provider: "google", 
          model: GOOGLE_MODEL,
          tts_provider: "google",
          has_tts: true,
          audio_generated: true
        }
      })
      .eq('id', newAssistantMessage.id);

    if (updateError) {
      console.warn("[conversation-llm-tts] Warning: Could not update message with TTS metadata:", updateError);
    }

    // 5. Return combined response with both message and audio
    const combinedResponse = {
      ...newAssistantMessage,
      audioUrl: audioDataUrl
    };

    console.log("[conversation-llm-tts] Returning combined LLM+TTS response to client.");
    return new Response(JSON.stringify(combinedResponse), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("[conversation-llm-tts] An unexpected error occurred:", err);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
