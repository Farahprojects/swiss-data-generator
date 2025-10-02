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
    const { user_id, conversation_id, title, share_token, share_mode, notes } = requestBody;

    // Most actions require user_id, except get_shared_conversation which is public
    if (!user_id && action !== 'get_shared_conversation') {
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

      case 'list_conversations':
        // List all conversations for authenticated user
        const { data: conversations, error: listError } = await supabaseClient
          .from('conversations')
          .select('id, user_id, title, created_at, updated_at')
          .eq('user_id', user_id)
          .order('updated_at', { ascending: false });

        if (listError) throw listError;
        result = conversations || [];
        break;

      case 'delete_conversation':
        // Delete conversation and all its messages
        if (!conversation_id) {
          return new Response('conversation_id is required for delete', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        // First delete all messages in this conversation
        const { error: messagesError } = await supabaseClient
          .from('messages')
          .delete()
          .eq('chat_id', conversation_id);

        if (messagesError) throw messagesError;

        // Then delete the conversation itself
        const { error: deleteError } = await supabaseClient
          .from('conversations')
          .delete()
          .eq('id', conversation_id)
          .eq('user_id', user_id);

        if (deleteError) throw deleteError;
        result = { success: true, conversation_id };
        break;

      case 'update_conversation_title':
        // Update conversation title
        if (!conversation_id) {
          return new Response('conversation_id is required for title update', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        if (!title) {
          return new Response('title is required for title update', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        const { error: titleUpdateError } = await supabaseClient
          .from('conversations')
          .update({ 
            title,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversation_id)
          .eq('user_id', user_id);

        if (titleUpdateError) throw titleUpdateError;
        result = { success: true, conversation_id };
        break;

      case 'share_conversation':
        // Share a conversation publicly by generating a share token
        if (!conversation_id) {
          return new Response('conversation_id is required for sharing', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        // Generate a unique share token
        const shareToken = crypto.randomUUID();
        // Default to view_only if not specified
        const effectiveShareMode = share_mode || 'view_only';

        const { error: shareError } = await supabaseClient
          .from('conversations')
          .update({ 
            is_public: true,
            share_token: shareToken,
            share_mode: effectiveShareMode,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversation_id)
          .eq('user_id', user_id);

        if (shareError) throw shareError;
        result = { share_token: shareToken, conversation_id, share_mode: effectiveShareMode };
        break;

      case 'unshare_conversation':
        // Stop sharing a conversation
        if (!conversation_id) {
          return new Response('conversation_id is required for unsharing', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        const { error: unshareError } = await supabaseClient
          .from('conversations')
          .update({ 
            is_public: false,
            share_token: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversation_id)
          .eq('user_id', user_id);

        if (unshareError) throw unshareError;
        result = { success: true, conversation_id };
        break;

      case 'get_shared_conversation':
        // Get a shared conversation by share token (public access)
        if (!share_token) {
          return new Response('share_token is required', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        const { data: sharedConversation, error: getSharedError } = await supabaseClient
          .from('conversations')
          .select('id, user_id, title, created_at, updated_at, meta, share_mode')
          .eq('share_token', share_token)
          .eq('is_public', true)
          .single();

        if (getSharedError || !sharedConversation) {
          return new Response('Shared conversation not found', { 
            status: 404, 
            headers: corsHeaders 
          });
        }

        result = sharedConversation;
        break;

      case 'join_conversation':
        // Join a shared conversation as a participant (requires auth)
        if (!share_token) {
          return new Response('share_token is required', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        // Verify the conversation exists and is shared with join_conversation mode
        const { data: convToJoin, error: joinCheckError } = await supabaseClient
          .from('conversations')
          .select('id, share_mode')
          .eq('share_token', share_token)
          .eq('is_public', true)
          .single();

        if (joinCheckError || !convToJoin) {
          return new Response('Shared conversation not found', { 
            status: 404, 
            headers: corsHeaders 
          });
        }

        if (convToJoin.share_mode !== 'join_conversation') {
          return new Response('This conversation is not accepting participants', { 
            status: 403, 
            headers: corsHeaders 
          });
        }

        // Check if user is already a participant
        const { data: existingParticipant } = await supabaseClient
          .from('conversation_participants')
          .select('id')
          .eq('conversation_id', convToJoin.id)
          .eq('user_id', user_id)
          .single();

        if (!existingParticipant) {
          // Add user as participant
          const { error: joinError } = await supabaseClient
            .from('conversation_participants')
            .insert({
              conversation_id: convToJoin.id,
              user_id,
              role: 'participant',
              notes: {}
            });

          if (joinError) throw joinError;
        }

        result = { conversation_id: convToJoin.id, success: true };
        break;

      case 'leave_conversation':
        // Leave a conversation as a participant
        if (!conversation_id) {
          return new Response('conversation_id is required', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        const { error: leaveError } = await supabaseClient
          .from('conversation_participants')
          .delete()
          .eq('conversation_id', conversation_id)
          .eq('user_id', user_id);

        if (leaveError) throw leaveError;
        result = { success: true, conversation_id };
        break;

      case 'get_conversation_participants':
        // Get all participants in a conversation
        if (!conversation_id) {
          return new Response('conversation_id is required', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        const { data: participants, error: participantsError } = await supabaseClient
          .from('conversation_participants')
          .select('id, user_id, role, joined_at, last_seen_at')
          .eq('conversation_id', conversation_id)
          .order('joined_at', { ascending: true });

        if (participantsError) throw participantsError;
        result = participants || [];
        break;

      case 'update_participant_notes':
        // Update coach notes for a participant (private to the coach)
        if (!conversation_id) {
          return new Response('conversation_id is required', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        if (notes === undefined) {
          return new Response('notes is required', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        const { error: notesError } = await supabaseClient
          .from('conversation_participants')
          .update({ 
            notes,
            last_seen_at: new Date().toISOString()
          })
          .eq('conversation_id', conversation_id)
          .eq('user_id', user_id);

        if (notesError) throw notesError;
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