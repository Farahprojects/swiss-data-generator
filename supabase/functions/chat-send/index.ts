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
    
    const { chat_id, guest_id, text, client_msg_id } = body;
    
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

    // Save message to DB (fire and forget)
    const userMessageData = {
      chat_id,
      role: "user",
      text,
      client_msg_id: client_msg_id || crypto.randomUUID(),
      status: "complete",
      meta: {}
    };
    console.log('[chat-send] Inserting user message:', userMessageData);

    const { error: userError } = await supabase
      .from("messages")
      .upsert(userMessageData, { onConflict: "client_msg_id" });

    if (userError) {
      console.error('[chat-send] User message insert failed:', userError);
      return new Response(JSON.stringify({ error: "Failed to save message" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log('[chat-send] User message inserted');

    // Call llm-handler (fire and forget)
    const llmResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/llm-handler`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ chat_id }),
    });

    if (!llmResponse.ok) {
      console.error('[chat-send] Failed to trigger llm-handler:', await llmResponse.text());
    } else {
      console.log('[chat-send] Successfully triggered llm-handler');
    }

    // Return success response immediately
    return new Response(JSON.stringify({ message: "Message sent" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('[chat-send] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});