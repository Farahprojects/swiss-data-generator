import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Sanitize text to remove markdown, formatting tokens, and unwanted characters
function sanitizePlainText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    // Remove markdown headers (# ## ###)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic markers (* ** _)
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    // Remove brackets and parentheses with content
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    // Remove curly braces
    .replace(/\{[^}]*\}/g, '')
    // Remove remaining special characters
    .replace(/[#*_\[\](){}]/g, '')
    // Remove backticks for code
    .replace(/`+([^`]*)`+/g, '$1')
    // Remove strikethrough
    .replace(/~~([^~]+)~~/g, '$1')
    // Normalize whitespace - replace multiple spaces/newlines with single space
    .replace(/\s+/g, ' ')
    // Trim leading/trailing whitespace
    .trim();
}

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

    // Sanitize user text before saving to database
    const sanitizedText = sanitizePlainText(text);
    const originalText = text; // Keep original for LLM context
    
    console.log('[chat-send] Text sanitization:', {
      original_length: originalText.length,
      sanitized_length: sanitizedText.length,
      changed: originalText !== sanitizedText
    });

    // Save message to DB (fire and forget)
    const userMessageData = {
      chat_id,
      role: "user",
      text: sanitizedText, // Save sanitized text to DB
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

    // Await the response from llm-handler to get the assistant's message
    console.log('[chat-send] Awaiting response from llm-handler');
    const llmResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/llm-handler`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
      },
      body: JSON.stringify({
        chat_id,
        text: originalText, // Send original text to LLM for better context
        client_msg_id: client_msg_id || userMessageData.client_msg_id,
        mode,
        sessionId
      })
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error('[chat-send] llm-handler failed:', errorText);
      throw new Error(`LLM handler failed: ${errorText}`);
    }

    const assistantMessage = await llmResponse.json();
    console.log('[chat-send] Received assistant message from llm-handler:', assistantMessage);

    // Return the assistant's message directly to the client
    return new Response(JSON.stringify(assistantMessage), {
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
