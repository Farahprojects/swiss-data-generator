import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  console.log(`[verify-chat-access] Received ${req.method} request`);

  if (req.method === 'OPTIONS') {
    console.log('[verify-chat-access] Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { chat_id, guest_id } = body;
    
    console.log('[verify-chat-access] Verifying access for:', { chat_id, guest_id });

    // Case 1: Verify existing chat_id (for refresh/tampering check)
    if (chat_id) {
      console.log('[verify-chat-access] Verifying persisted chat_id:', chat_id);
      
      const { data: guestReport, error } = await supabaseAdmin
        .from('guest_reports')
        .select('id, chat_id')
        .eq('chat_id', chat_id)
        .single();

      if (error || !guestReport) {
        console.warn('[verify-chat-access] ❌ Invalid chat_id - possible tampering:', chat_id);
        return new Response(JSON.stringify({ 
          valid: false, 
          reason: 'chat_id_invalid',
          message: 'Chat ID not found or invalid'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('[verify-chat-access] ✅ chat_id verified for guest:', guestReport.id);
      return new Response(JSON.stringify({ 
        valid: true, 
        chat_id: guestReport.chat_id,
        guest_id: guestReport.id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Case 2: Get chat_id for guest_id (initial lookup)
    if (guest_id) {
      console.log('[verify-chat-access] Fetching chat_id for guest:', guest_id);
      
      const { data: guestReport, error } = await supabaseAdmin
        .from('guest_reports')
        .select('id, chat_id')
        .eq('id', guest_id)
        .single();

      if (error || !guestReport) {
        console.warn('[verify-chat-access] ❌ Guest not found:', guest_id);
        return new Response(JSON.stringify({ 
          valid: false, 
          reason: 'guest_not_found',
          message: 'Guest ID not found'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!guestReport.chat_id) {
        console.warn('[verify-chat-access] ❌ Guest has no chat_id:', guest_id);
        return new Response(JSON.stringify({ 
          valid: false, 
          reason: 'no_chat_id',
          message: 'Guest has no associated chat ID'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('[verify-chat-access] ✅ Found chat_id for guest:', guest_id);
      return new Response(JSON.stringify({ 
        valid: true, 
        chat_id: guestReport.chat_id,
        guest_id: guestReport.id 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No chat_id or guest_id provided
    return new Response(JSON.stringify({ 
      valid: false, 
      reason: 'missing_params',
      message: 'Either chat_id or guest_id is required'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[verify-chat-access] Error:', error);
    return new Response(JSON.stringify({ 
      valid: false, 
      reason: 'server_error',
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
