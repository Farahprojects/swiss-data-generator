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
    const requestBody = await req.json();
    const { action, guest_id, thread_id, title } = requestBody;

    if (method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    let result;

    switch (action) {
      case 'initialize_guest':
        // Create a new guest_id and return it (no DB operations needed)
        const newGuestId = crypto.randomUUID();
        console.log(`[threads-manager] Initialized new guest: ${newGuestId}`);
        
        result = { guest_id: newGuestId };
        break;
      case 'list_threads':
        if (!guest_id) {
          return new Response('guest_id is required', { 
            status: 400, 
            headers: corsHeaders 
          });
        }
        
        // List all guest chat threads
        const { data: guestReports, error: listError } = await supabaseClient
          .from('guest_reports')
          .select('chat_id, email, created_at, id')
          .eq('user_id', guest_id) // guest_id is stored in user_id for guests
          .order('created_at', { ascending: false });

        if (listError) throw listError;

        // Transform to thread format
        const threads = (guestReports || []).map(report => ({
          id: report.chat_id,
          title: `Chat ${report.chat_id.slice(0, 8)}...`,
          created_at: report.created_at,
          updated_at: report.created_at
        }));

        result = { threads };
        break;

      case 'create_thread':
        if (!guest_id) {
          return new Response('guest_id is required', { 
            status: 400, 
            headers: corsHeaders 
          });
        }
        
        // Step 1: Validate payment status before creating thread
        console.log(`[threads-manager] Validating payment status for guest ${guest_id}`);
        
        const { data: existingGuestReport, error: queryError } = await supabaseClient
          .from('guest_reports')
          .select('id, payment_status, chat_id')
          .eq('id', guest_id)
          .single();

        if (queryError || !existingGuestReport) {
          console.log(`[threads-manager] No guest report found for ${guest_id}, creating new one`);
          
          // Create a new guest chat thread - SERVER-SIDE GENERATION
          const newChatId = crypto.randomUUID();
          
          const { data: newReport, error: createError } = await supabaseClient
            .from('guest_reports')
            .insert({
              chat_id: newChatId,
              user_id: guest_id, // guest_id stored in user_id field
              email: 'guest@temp.email', // placeholder
              report_data: {},
              amount_paid: 0,
              payment_status: 'pending'
            })
            .select()
            .single();

          if (createError) throw createError;

          console.log(`[threads-manager] Created new thread ${newChatId} for guest ${guest_id}`);

          result = { 
            thread_id: newChatId,
            thread: {
              id: newChatId,
              title: title || `Chat ${newChatId.slice(0, 8)}...`,
              created_at: newReport.created_at,
              updated_at: newReport.created_at
            }
          };
        } else {
          // Step 2: Check payment status for existing guest
          if (existingGuestReport.payment_status !== 'paid') {
            console.log(`[threads-manager] Payment not completed for guest ${guest_id}, status: ${existingGuestReport.payment_status}`);
            return new Response(JSON.stringify({
              error: 'Payment not completed',
              payment_status: existingGuestReport.payment_status,
              message: 'Please complete payment before creating a chat thread'
            }), {
              status: 402, // Payment Required
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Step 3: Use existing chat_id if payment is completed
          console.log(`[threads-manager] Payment verified for guest ${guest_id}, using existing chat_id: ${existingGuestReport.chat_id}`);
          
          result = { 
            thread_id: existingGuestReport.chat_id,
            thread: {
              id: existingGuestReport.chat_id,
              title: title || `Chat ${existingGuestReport.chat_id.slice(0, 8)}...`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          };
        }
        break;

      case 'delete_thread':
        if (!guest_id) {
          return new Response('guest_id is required', { 
            status: 400, 
            headers: corsHeaders 
          });
        }
        
        // Delete guest chat thread and its messages - VERIFY OWNERSHIP
        if (!thread_id) {
          return new Response('thread_id is required for delete', { 
            status: 400, 
            headers: corsHeaders 
          });
        }

        // First verify the thread belongs to this guest user
        const { data: ownershipCheck, error: ownershipError } = await supabaseClient
          .from('guest_reports')
          .select('id')
          .eq('chat_id', thread_id)
          .eq('user_id', guest_id)
          .single();

        if (ownershipError || !ownershipCheck) {
          return new Response('Thread not found or unauthorized', { 
            status: 404, 
            headers: corsHeaders 
          });
        }

        // Delete all messages for this chat_id
        const { error: messagesError } = await supabaseClient
          .from('messages')
          .delete()
          .eq('chat_id', thread_id);

        if (messagesError) throw messagesError;

        // Delete the guest report (thread) - double-check user ownership
        const { error: deleteError } = await supabaseClient
          .from('guest_reports')
          .delete()
          .eq('chat_id', thread_id)
          .eq('user_id', guest_id);

        if (deleteError) throw deleteError;

        console.log(`[threads-manager] Deleted thread ${thread_id} for guest ${guest_id}`);

        result = { success: true, thread_id };
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
    console.error('Error in threads-manager:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});