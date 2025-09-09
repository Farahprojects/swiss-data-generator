import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CleanGuestDataRequest {
  chat_id?: string;
  guest_report_id?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { chat_id, guest_report_id }: CleanGuestDataRequest = await req.json();

    console.log(`[CleanGuestData] Starting cleanup for chat_id: ${chat_id}, guest_report_id: ${guest_report_id}`);

    let targetChatId = chat_id;

    // If we don't have chat_id but have guest_report_id, fetch it
    if (!targetChatId && guest_report_id) {
      const { data: guestReport, error: fetchError } = await supabase
        .from('guest_reports')
        .select('chat_id')
        .eq('id', guest_report_id)
        .single();

      if (fetchError) {
        console.error('[CleanGuestData] Error fetching guest report:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch guest report', details: fetchError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      targetChatId = guestReport?.chat_id;
    }

    if (!targetChatId) {
      return new Response(
        JSON.stringify({ error: 'No chat_id found to clean' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CleanGuestData] Cleaning data for chat_id: ${targetChatId}`);

    // 1. Delete all messages for this chat_id
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('chat_id', targetChatId);

    if (messagesError) {
      console.error('[CleanGuestData] Error deleting messages:', messagesError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete messages', details: messagesError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Delete chat audio clips for this chat_id
    const { error: audioError } = await supabase
      .from('chat_audio_clips')
      .delete()
      .eq('chat_id', targetChatId);

    if (audioError) {
      console.error('[CleanGuestData] Error deleting audio clips:', audioError);
      // Don't fail the whole operation for audio cleanup
    }

    // 3. Delete message block summaries for this chat_id
    const { error: summariesError } = await supabase
      .from('message_block_summaries')
      .delete()
      .eq('chat_id', targetChatId);

    if (summariesError) {
      console.error('[CleanGuestData] Error deleting summaries:', summariesError);
      // Don't fail the whole operation for summaries cleanup
    }

    // 4. Clear chat_id from guest_reports (keep the record for payment history)
    const { error: guestReportError } = await supabase
      .from('guest_reports')
      .update({ chat_id: null })
      .eq('chat_id', targetChatId);

    if (guestReportError) {
      console.error('[CleanGuestData] Error updating guest_reports:', guestReportError);
      return new Response(
        JSON.stringify({ error: 'Failed to clear chat_id from guest_reports', details: guestReportError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CleanGuestData] Successfully cleaned all data for chat_id: ${targetChatId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Guest chat data cleaned successfully',
        chat_id: targetChatId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CleanGuestData] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
