import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('VITE_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { method } = req;
    const requestBody = await req.json();
    const { action, user_id, thread_id, title } = requestBody;

    if (method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    if (!user_id) {
      return new Response('user_id is required for authenticated users', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    let result;

    switch (action) {
      case 'list_threads':
        // List all user conversations
        const { data: conversations, error: listError } = await supabaseClient
          .from('conversations')
          .select('id, title, created_at, updated_at')
          .eq('user_id', user_id)
          .order('updated_at', { ascending: false });

        if (listError) throw listError;

        result = { threads: conversations || [] };
        break;

      case 'create_thread':
        // Create new conversation for authenticated user
        const newChatId = crypto.randomUUID();
        
        const { data: newConversation, error: createError } = await supabaseClient
          .from('conversations')
          .insert({
            id: newChatId,
            user_id: user_id,
            title: title || 'New Chat',
            meta: {}
          })
          .select()
          .single();

        if (createError) throw createError;

        console.log(`[threads-manager] Created new conversation ${newChatId} for user ${user_id}`);

        result = { 
          thread_id: newChatId,
          thread: {
            id: newChatId,
            title: title || 'New Chat',
            created_at: newConversation.created_at,
            updated_at: newConversation.created_at
          }
        };
        break;

      case 'get_thread':
        // Get specific conversation
        const { data: conversation, error: getError } = await supabaseClient
          .from('conversations')
          .select('id, title, created_at, updated_at')
          .eq('user_id', user_id)
          .eq('id', thread_id)
          .single();

        if (getError) throw getError;

        result = { thread: conversation };
        break;

      case 'delete_thread':
        // Delete conversation
        const { error: deleteError } = await supabaseClient
          .from('conversations')
          .delete()
          .eq('user_id', user_id)
          .eq('id', thread_id);

        if (deleteError) throw deleteError;

        result = { success: true };
        break;

      default:
        return new Response('Invalid action', { 
          status: 400, 
          headers: corsHeaders 
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[threads-manager] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});