import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { guest_report_id } = body;

    if (!guest_report_id) {
      throw new Error("Missing 'guest_report_id' in request body.");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    console.log(`[delete-guest-data] Starting deletion for guest_report_id: ${guest_report_id}`);

    // Get the chat_id from guest_reports first
    const { data: guestReport, error: guestError } = await supabase
      .from('guest_reports')
      .select('chat_id')
      .eq('id', guest_report_id)
      .single();

    if (guestError || !guestReport) {
      console.error(`[delete-guest-data] Guest report not found: ${guest_report_id}`, guestError);
      throw new Error("Guest report not found");
    }

    const chat_id = guestReport.chat_id;
    console.log(`[delete-guest-data] Found chat_id: ${chat_id} for guest_report_id: ${guest_report_id}`);

    // Delete in correct order to handle foreign key constraints
    
    // 1. Delete report ready signals
    const { error: signalsError } = await supabase
      .from('report_ready_signals')
      .delete()
      .eq('guest_report_id', guest_report_id);

    if (signalsError) {
      console.error(`[delete-guest-data] Error deleting report_ready_signals:`, signalsError);
    } else {
      console.log(`[delete-guest-data] Deleted report_ready_signals for guest_report_id: ${guest_report_id}`);
    }

    // 2. Delete messages for this chat_id
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('chat_id', chat_id);

    if (messagesError) {
      console.error(`[delete-guest-data] Error deleting messages:`, messagesError);
    } else {
      console.log(`[delete-guest-data] Deleted messages for chat_id: ${chat_id}`);
    }

    // 3. Delete chat audio clips for this chat_id
    const { error: audioError } = await supabase
      .from('chat_audio_clips')
      .delete()
      .eq('chat_id', chat_id);

    if (audioError) {
      console.error(`[delete-guest-data] Error deleting chat_audio_clips:`, audioError);
    } else {
      console.log(`[delete-guest-data] Deleted chat_audio_clips for chat_id: ${chat_id}`);
    }

    // 4. Finally delete the guest report itself
    const { error: guestDeleteError } = await supabase
      .from('guest_reports')
      .delete()
      .eq('id', guest_report_id);

    if (guestDeleteError) {
      console.error(`[delete-guest-data] Error deleting guest_report:`, guestDeleteError);
      throw new Error("Failed to delete guest report");
    }

    console.log(`[delete-guest-data] Successfully deleted guest_report_id: ${guest_report_id} and all related data`);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Guest data deleted successfully",
      deleted_guest_report_id: guest_report_id,
      deleted_chat_id: chat_id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[delete-guest-data] Error:", error);
    return new Response(JSON.stringify({ 
      error: error?.message ?? String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
