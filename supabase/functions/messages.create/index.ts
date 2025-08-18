// supabase/functions/messages.create/index.ts
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  console.log("[messages.create] Function invoked.");

  if (req.method === 'OPTIONS') {
    console.log("[messages.create] Handling OPTIONS request.");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("[messages.create] Received payload:", payload);
    
    const { chat_id, text, client_msg_id } = payload;
    if (!chat_id || !text || !client_msg_id) {
      console.error("[messages.create] Validation failed: Missing fields.", { chat_id: !!chat_id, text: !!text, client_msg_id: !!client_msg_id });
      return new Response(JSON.stringify({ error: "Missing required fields: chat_id, text, client_msg_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`[messages.create] Payload validated for chat_id: ${chat_id}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const messageToUpsert = {
      chat_id,
      role: "user",
      text,
      client_msg_id,
      status: "complete",
      meta: {}
    };

    console.log("[messages.create] Attempting to upsert user message:", messageToUpsert);

    const { data, error } = await supabase
      .from("messages")
      .upsert(messageToUpsert, { onConflict: "client_msg_id" })
      .select("id, chat_id, created_at")
      .single();

    if (error) {
      console.error('[messages.create] DATABASE ERROR during upsert:', error);
      throw error;
    }
    
    console.log("[messages.create] SUCCESSFULLY saved user message. DB response:", data);

    const responsePayload = { message_id: data.id, chat_id: data.chat_id, created_at: data.created_at };
    console.log("[messages.create] Sending success response to client:", responsePayload);

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error('[messages.create] An unexpected error occurred in catch block:', e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
