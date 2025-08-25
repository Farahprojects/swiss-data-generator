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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { method } = req;
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    const requestBody = await req.json();
    const { user_id, conversation_id, title } = requestBody;

    if (!user_id) {
      return new Response('user_id is required', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    let result;

    switch (action) {
      case 'create_conversation':
        // Create a new conversation for authenticated user
        const { data: newConversation, error: createError } = await supabaseClient
          .from('conversations')
          .insert({
            user_id,
            title: title || 'New Conversation',
            meta: {}
          })
          .select()
          .single();

        if (createError) throw createError;
        result = newConversation;
        break;

      case 'get_or_create_conversation':
        // Get existing conversation or create new one
        if (conversation_id) {
          // Verify conversation belongs to user
          const { data: existingConv, error: getError } = await supabaseClient
            .from('conversations')
            .select('*')
            .eq('id', conversation_id)
            .eq('user_id', user_id)
            .single();

          if (getError || !existingConv) {
            return new Response('Conversation not found or access denied', { 
              status: 404, 
              headers: corsHeaders 
            });
          }
          result = existingConv;
        } else {
          // Create new conversation
          const { data: newConv, error: createNewError } = await supabaseClient
            .from('conversations')
            .insert({
              user_id,
              title: title || 'New Conversation',
              meta: {}
            })
            .select()
            .single();

          if (createNewError) throw createNewError;
          result = newConv;
        }
        break;

      case 'update_conversation_activity':
        // Update conversation's updated_at timestamp when new message is added
        if (!conversation_id) {
          return new Response('conversation_id is required for update', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        const { error: updateError } = await supabaseClient
          .from('conversations')
          .update({ 
            updated_at: new Date().toISOString(),
            title: title || undefined // Only update title if provided
          })
          .eq('id', conversation_id)
          .eq('user_id', user_id);

        if (updateError) throw updateError;
        result = { success: true, conversation_id };
        break;

      default:
        return new Response('Invalid action', { 
          status: 400, 
          headers: corsHeaders 
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in conversation-manager:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});