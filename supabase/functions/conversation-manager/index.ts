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
        const newChatId = crypto.randomUUID();
        
        // Create conversation
        const { data: newConversation, error: createError } = await supabaseClient
          .from('conversations')
          .insert({
            id: newChatId,
            owner_user_id: user_id,
            title: title || 'New Conversation',
            meta: {}
          })
          .select()
          .single();

        if (createError) throw createError;

        // Add owner as participant
        await supabaseClient
          .from('conversations_participants')
          .insert({
            conversation_id: newChatId,
            user_id: user_id,
            role: 'owner'
          });

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
        // List all conversations user is a participant in
        const { data: conversations, error: listError } = await supabaseClient
          .from('conversations')
          .select(`
            id, title, created_at, updated_at, meta, is_public,
            conversations_participants!inner(role)
          `)
          .eq('conversations_participants.user_id', user_id)
          .order('updated_at', { ascending: false });

        if (listError) throw listError;

        // Compute has_other_participants for each conversation (owners see pill once someone else joined)
        let conversationsWithFlag = conversations || [];
        if (conversationsWithFlag.length > 0) {
          const conversationIds = conversationsWithFlag.map((c: any) => c.id);
          const { data: otherParticipants, error: otherErr } = await supabaseClient
            .from('conversations_participants')
            .select('conversation_id, user_id')
            .in('conversation_id', conversationIds)
            .neq('user_id', user_id);

          if (otherErr) {
            console.error('[conversation-manager] Failed to load other participants:', otherErr);
          } else {
            const otherCountByConversation: Record<string, number> = {};
            for (const row of otherParticipants || []) {
              const cid = (row as any).conversation_id;
              otherCountByConversation[cid] = (otherCountByConversation[cid] || 0) + 1;
            }
            conversationsWithFlag = conversationsWithFlag.map((c: any) => ({
              ...c,
              has_other_participants: (otherCountByConversation[c.id] || 0) > 0,
            }));
          }
        }

        result = conversationsWithFlag;
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
        // Share a conversation publicly (make it accessible via public link)
        if (!conversation_id) {
          return new Response('conversation_id is required for sharing', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        const { error: shareError } = await supabaseClient
          .from('conversations')
          .update({ 
            is_public: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversation_id)
          .eq('owner_user_id', user_id);

        if (shareError) throw shareError;
        result = { success: true, conversation_id, is_public: true };
        break;

      case 'unshare_conversation':
        // Stop sharing a conversation (make it private)
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
            updated_at: new Date().toISOString()
          })
          .eq('id', conversation_id)
          .eq('owner_user_id', user_id);

        if (unshareError) throw unshareError;
        result = { success: true, conversation_id, is_public: false };
        break;

      case 'join_conversation':
        // Join a public conversation as a participant
        if (!conversation_id) {
          return new Response('conversation_id is required for joining', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        // Verify conversation is public
        const { data: publicConv, error: publicError } = await supabaseClient
          .from('conversations')
          .select('id, is_public')
          .eq('id', conversation_id)
          .eq('is_public', true)
          .single();

        if (publicError || !publicConv) {
          return new Response('Conversation not found or not public', { 
            status: 404, 
            headers: corsHeaders 
          });
        }

        // Add user as participant (ignore if already exists)
        await supabaseClient
          .from('conversations_participants')
          .insert({
            conversation_id: conversation_id,
            user_id: user_id,
            role: 'member'
          })
          .onConflict('conversation_id,user_id')
          .ignoreDuplicates();

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