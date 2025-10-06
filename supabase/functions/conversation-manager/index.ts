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
    const { user_id, conversation_id, title, invitee_email } = requestBody;

    // All actions require user_id
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

      case 'invite_user_to_conversation':
        // Invite a user to a conversation by email
        if (!conversation_id) {
          return new Response('conversation_id is required', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        if (!invitee_email) {
          return new Response('invitee_email is required', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        // First verify the conversation belongs to the inviter
        const { data: conversation, error: convError } = await supabaseClient
          .from('conversations')
          .select('id, user_id, title')
          .eq('id', conversation_id)
          .eq('user_id', user_id)
          .single();

        if (convError || !conversation) {
          return new Response('Conversation not found or access denied', { 
            status: 404, 
            headers: corsHeaders 
          });
        }

        // Look up the invitee by email in auth.users
        const { data: inviteeUser, error: userError } = await supabaseClient.auth.admin.getUserByEmail(invitee_email);

        if (userError || !inviteeUser?.user) {
          return new Response('User not found with that email address', { 
            status: 404, 
            headers: corsHeaders 
          });
        }

        const inviteeUserId = inviteeUser.user.id;

        // Check if user is trying to invite themselves
        if (inviteeUserId === user_id) {
          return new Response('Cannot invite yourself to a conversation', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        // Check if invitee already has access to this conversation
        const { data: existingAccess } = await supabaseClient
          .from('conversations')
          .select('id')
          .eq('id', conversation_id)
          .eq('user_id', inviteeUserId)
          .single();

        if (existingAccess) {
          return new Response('User already has access to this conversation', { 
            status: 409, 
            headers: corsHeaders 
          });
        }

        // Create shared conversation record for the invitee
        const { data: sharedConv, error: shareError } = await supabaseClient
          .from('conversations')
          .insert({
            id: conversation_id, // Same chat_id as original
            user_id: inviteeUserId,
            title: conversation.title,
            shared_from_user_id: user_id,
            is_shared_copy: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (shareError) throw shareError;

        result = { 
          success: true, 
          conversation_id, 
          invitee_user_id: inviteeUserId,
          invitee_email 
        };
        break;

      case 'unshare_conversation':
        // Remove shared access to a conversation
        if (!conversation_id) {
          return new Response('conversation_id is required', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        // Verify the conversation belongs to the user
        const { data: ownerConv, error: ownerError } = await supabaseClient
          .from('conversations')
          .select('id')
          .eq('id', conversation_id)
          .eq('user_id', user_id)
          .single();

        if (ownerError || !ownerConv) {
          return new Response('Conversation not found or access denied', { 
            status: 404, 
            headers: corsHeaders 
          });
        }

        // Delete all shared copies of this conversation
        const { error: unshareError } = await supabaseClient
          .from('conversations')
          .delete()
          .eq('id', conversation_id)
          .eq('shared_from_user_id', user_id);

        if (unshareError) throw unshareError;

        result = { success: true, conversation_id };
        break;

      case 'remove_user_from_conversation':
        // Remove a specific user from a shared conversation
        if (!conversation_id) {
          return new Response('conversation_id is required', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        if (!invitee_email) {
          return new Response('invitee_email is required', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        // Verify the conversation belongs to the user
        const { data: ownerConv2, error: ownerError2 } = await supabaseClient
          .from('conversations')
          .select('id')
          .eq('id', conversation_id)
          .eq('user_id', user_id)
          .single();

        if (ownerError2 || !ownerConv2) {
          return new Response('Conversation not found or access denied', { 
            status: 404, 
            headers: corsHeaders 
          });
        }

        // Look up the user to remove by email
        const { data: userToRemove, error: removeUserError } = await supabaseClient.auth.admin.getUserByEmail(invitee_email);

        if (removeUserError || !userToRemove?.user) {
          return new Response('User not found with that email address', { 
            status: 404, 
            headers: corsHeaders 
          });
        }

        // Delete the shared conversation record for this user
        const { error: removeError } = await supabaseClient
          .from('conversations')
          .delete()
          .eq('id', conversation_id)
          .eq('user_id', userToRemove.user.id)
          .eq('shared_from_user_id', user_id);

        if (removeError) throw removeError;

        result = { 
          success: true, 
          conversation_id, 
          removed_user_email: invitee_email 
        };
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