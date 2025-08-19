// supabase/functions/messages.create/index.ts
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { chat_id, text, client_msg_id } = await req.json();
    if (!chat_id || !text || !client_msg_id) {
      return new Response(JSON.stringify({ error: "Missing required fields: chat_id, text, client_msg_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase
      .from("messages")
      .upsert({
        chat_id,
        role: "user",
        text,
        client_msg_id,
        status: "complete",
        meta: {}
      }, { onConflict: "client_msg_id" })
      .select("id, chat_id, created_at")
      .single();

    if (error) {
      console.error('Error upserting user message:', error);
      throw error;
    }

    return new Response(JSON.stringify({ message_id: data.id, chat_id: data.chat_id, created_at: data.created_at }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error('An unexpected error occurred:', e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});