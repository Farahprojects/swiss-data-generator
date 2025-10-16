import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  let requestBody; // Declare outside try block for error handler access

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

    if (method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    requestBody = await req.json(); // Assign inside try
    const { user_id, conversation_id, title, mode, reportType, report_data, email, name, request } = requestBody;
    const action = url.searchParams.get('action');

    // All actions require user_id
    if (!user_id) {
      return new Response('user_id is required', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Validate mode for create actions
    if ((action === 'create_conversation' || action === 'get_or_create_conversation') && !mode) {
      console.error('[conversation-manager] MODE VALIDATION FAILED:', {
        action,
        user_id,
        mode,
        title,
        message: 'mode is required but was not provided'
      });
      return new Response('mode is required for conversation creation', { 
        status: 400, 
        headers: corsHeaders 
      });
    }
    
    // Log mode validation success
    if (action === 'create_conversation' || action === 'get_or_create_conversation') {
      console.log('[conversation-manager] MODE VALIDATED:', {
        action,
        user_id,
        mode,
        title
      });
    }

    let result;

    switch (action) {
      case 'create_conversation':
        // Create a new conversation for authenticated user
        const newChatId = crypto.randomUUID();
        
        console.log('[conversation-manager] CREATING CONVERSATION:', {
          id: newChatId,
          user_id,
          mode,
          title: title || 'New Conversation'
        });
        
        // Create conversation (owned, not shared yet)
        // No participant row added - participants are only for shared conversations
        const { data: newConversation, error: createError } = await supabaseClient
          .from('conversations')
          .insert({
            id: newChatId,
            user_id: user_id,
            owner_user_id: user_id,
            title: title || 'New Conversation',
            mode: mode,
            meta: {}
          })
          .select()
          .single();

        if (createError) {
          console.error('[conversation-manager] CREATE FAILED:', {
            id: newChatId,
            user_id,
            mode,
            error: createError,
            error_message: createError.message,
            error_details: createError.details,
            error_hint: createError.hint
          });
          throw createError;
        }

        console.log('[conversation-manager] CREATE SUCCESS:', {
          id: newConversation.id,
          mode: newConversation.mode,
          title: newConversation.title
        });

        // Route by mode - mode determines behavior
        let isGeneratingReport = false;

        // Check if we have any astro data to process for astro mode
        const hasAstroData = report_data || request || reportType;

        if (mode === 'insight' || (mode === 'astro' && hasAstroData)) {
          // Insight mode always generates report
          // Astro mode generates report if any astro data is provided (report_data, request, or reportType)
          console.log('[conversation-manager] MODE-BASED ROUTING: Report generation triggered', {
            chat_id: newChatId,
            mode,
            reportType: reportType || 'N/A',
            hasReportData: !!report_data,
            hasRequest: !!request,
            hasReportType: !!reportType
          });

          // Get auth token from request for forwarding
          const authHeader = req.headers.get('Authorization');
          
          // Call initiate-auth-report to process the astro data
          const reportPayload = {
            chat_id: newChatId,
            report_data: report_data,
            email: email || '',
            name: name || '',
            mode: mode
          };

          // Fire-and-forget - don't wait for report processing
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/initiate-auth-report`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader || ''
            },
            body: JSON.stringify(reportPayload)
          }).catch(error => {
            console.error('[conversation-manager] Failed to trigger report:', error);
          });

          isGeneratingReport = true;
          console.log('[conversation-manager] Report generation initiated (async)');
        } else {
          console.log('[conversation-manager] MODE-BASED ROUTING: No report generation', {
            mode,
            reason: 'mode is chat or no report_data provided'
          });
        }

        // Return conversation with metadata about report generation
        result = {
          ...newConversation,
          is_generating_report: isGeneratingReport,
          reportType: reportType || null
        };
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
          console.log('[conversation-manager] GET_OR_CREATE - Creating new:', {
            user_id,
            mode,
            title: title || 'New Conversation'
          });
          
          const { data: newConv, error: createNewError } = await supabaseClient
            .from('conversations')
            .insert({
              user_id,
              title: title || 'New Conversation',
              mode: mode,
              meta: {}
            })
            .select()
            .single();

          if (createNewError) {
            console.error('[conversation-manager] GET_OR_CREATE FAILED:', {
              user_id,
              mode,
              error: createNewError,
              error_message: createNewError.message,
              error_details: createNewError.details
            });
            throw createNewError;
          }
          
          console.log('[conversation-manager] GET_OR_CREATE SUCCESS:', {
            id: newConv.id,
            mode: newConv.mode
          });
          
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
        // List all conversations: owned (user_id) + shared (via participants)
        
        // Fetch owned conversations (user_id = current user, no participant row needed)
        const { data: ownedConversations, error: ownedError } = await supabaseClient
          .from('conversations')
          .select('id, title, created_at, updated_at, meta, is_public, mode')
          .eq('user_id', user_id)
          .order('updated_at', { ascending: false });

        if (ownedError) throw ownedError;

        // Fetch shared conversations (via participants table)
        const { data: sharedConversations, error: sharedError } = await supabaseClient
          .from('conversations')
          .select(`
            id, title, created_at, updated_at, meta, is_public, mode,
            conversations_participants!inner(role)
          `)
          .eq('conversations_participants.user_id', user_id)
          .order('updated_at', { ascending: false });

        if (sharedError) throw sharedError;

        // Merge and dedupe by id (participants/shared should win over owned when both exist)
        const conversationMap = new Map();
        
        // First add shared (participants) so they take precedence
        for (const conv of (sharedConversations || [])) {
          conversationMap.set(conv.id, conv);
        }
        
        // Then add owned only if not already present
        for (const conv of (ownedConversations || [])) {
          if (!conversationMap.has(conv.id)) {
            conversationMap.set(conv.id, conv);
          }
        }
        
        const conversations = Array.from(conversationMap.values())
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

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

        // Add owner to conversations_participants when sharing
        // This allows shared conversations to appear in participants-based queries
        await supabaseClient
          .from('conversations_participants')
          .upsert({
            conversation_id: conversation_id,
            user_id: user_id,
            role: 'owner'
          }, { onConflict: 'conversation_id,user_id' });

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
          .upsert({
            conversation_id: conversation_id,
            user_id: user_id,
            role: 'member'
          }, { onConflict: 'conversation_id,user_id' });

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
    console.error('[conversation-manager] UNHANDLED ERROR:', {
      action: requestBody?.action,
      user_id: requestBody?.user_id,
      mode: requestBody?.mode,
      error: error,
      error_message: error.message,
      error_stack: error.stack
    });
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});