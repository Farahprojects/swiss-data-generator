// src/services/api/conversations.ts
import { supabase } from '@/integrations/supabase/client';
import { Conversation } from '@/core/types';
import { getGuestId } from '../auth/session';

// Legacy function - now replaced by secure token-based getOrCreateConversation
// Keeping for backward compatibility but should not be used for new chat flows
export const createConversation = async (reportId?: string): Promise<Conversation> => {
  const guestId = getGuestId();
  console.log('[createConversation] DEPRECATED: Called with reportId:', reportId, 'using guestId from session:', guestId);
  console.warn('[createConversation] This function is deprecated. Use getOrCreateConversation with secure tokens instead.');
  
  // FAIL FAST: If no guestId, don't create a fallback
  if (!guestId) {
    console.error('[createConversation] FAIL FAST: No guestId available');
    throw new Error('guestId is required for conversation creation');
  }
  
  // Log the exact values being inserted
  const insertData = { report_id: reportId, guest_id: guestId };
  console.log('[createConversation] INSERT data:', JSON.stringify(insertData));
  
  const { data, error } = await supabase
    .from('conversations')
    .insert(insertData)
    .select()
    .single();

  // Log the complete response
  console.log('[createConversation] Supabase response:', {
    status: error ? 'error' : 'success',
    data: data ? { id: data.id, guest_id: data.guest_id, report_id: data.report_id } : null,
    error: error ? { code: error.code, message: error.message, details: error.details } : null
  });

  if (error) {
    console.error('[createConversation] Database error:', error);
    throw new Error(error.message);
  }
  
  console.log('[createConversation] Created conversation:', data.id, 'with guestId:', guestId);
  return { ...data, messages: [] };
};

export const getConversationByReportId = async (reportId: string): Promise<Conversation | null> => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      messages (*)
    `)
    .eq('report_id', reportId)
    .order('created_at', { foreignTable: 'messages', ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Conversation | null;
};

export const listConversations = async (): Promise<Partial<Conversation>[]> => {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, created_at, updated_at, meta')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

export const getOrCreateConversation = async (uuid: string, token: string): Promise<{ conversationId: string }> => {
  console.log('[getOrCreateConversation] Called with uuid:', uuid, 'hasToken:', !!token);
  
  // FAIL FAST: Validate inputs
  if (!uuid) {
    console.error('[getOrCreateConversation] FAIL FAST: uuid is required');
    throw new Error('uuid is required for conversation creation');
  }
  if (!token) {
    console.error('[getOrCreateConversation] FAIL FAST: token is required');
    throw new Error('token is required for conversation creation');
  }
  
  // Try to find existing conversation by uuid (which maps to guest_id in our system)
  const { data: existing, error: fetchError } = await supabase
    .from('conversations')
    .select('id')
    .eq('guest_id', uuid)
    .limit(1)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  if (existing) {
    console.log('[getOrCreateConversation] Found existing conversation:', existing.id);
    
    // Even for existing conversations, try to inject context if it hasn't been done
    await injectContextMessages(existing.id, uuid, token);
    
    return { conversationId: existing.id };
  }

  // Create new conversation
  console.log('[getOrCreateConversation] Creating new conversation with uuid:', uuid);
  
  // Log the exact values being inserted - report_id is nullable now since we get report details from retrieve-temp-report
  const insertData = { guest_id: uuid, report_id: null }; 
  console.log('[getOrCreateConversation] INSERT data:', JSON.stringify(insertData));
  
  const { data: newConv, error: createError } = await supabase
    .from('conversations')
    .insert(insertData)
    .select('id')
    .single();

  // Log the complete response
  console.log('[getOrCreateConversation] Supabase response:', {
    status: createError ? 'error' : 'success',
    data: newConv ? { id: newConv.id } : null,
    error: createError ? { code: createError.code, message: createError.message, details: createError.details } : null
  });

  if (createError) {
    console.error('[getOrCreateConversation] Database error:', createError);
    throw new Error(createError.message);
  }
  
  console.log('[getOrCreateConversation] Created new conversation:', newConv.id);

  // Inject context from temp_report_data using secure tokens
  await injectContextMessages(newConv.id, uuid, token);
  
  return { conversationId: newConv.id };
};

// Helper function to inject context from temp_report_data
const injectContextMessages = async (conversationId: string, uuid: string, token: string): Promise<void> => {
  console.log('[injectContextMessages] Starting context injection for conversation:', conversationId);
  
  // Check if we've already injected context for this conversation
  const { data: existingMessages, error: checkError } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('role', 'user')
    .contains('meta', { type: 'context_injection' })
    .limit(1);

  if (checkError) {
    console.error('[injectContextMessages] Error checking for existing context:', checkError);
    return;
  }

  if (existingMessages && existingMessages.length > 0) {
    console.log('[injectContextMessages] Context already injected for this conversation, skipping');
    return;
  }

  // Step 1: Try fetching temp data (failsafe approach)
  let tempData = null;
  
  try {
    console.log('[injectContextMessages] Fetching temp report data for uuid:', uuid);
    const { data, error } = await supabase.functions.invoke('retrieve-temp-report', {
      body: { 
        uuid: uuid,
        token: token
      }
    });

    if (error) {
      console.warn('[injectContextMessages] Failed to fetch temp report:', error);
    } else if (!data || data.error) {
      console.warn('[injectContextMessages] No valid temp report returned:', data?.error);
    } else {
      tempData = data;
      console.log('[injectContextMessages] Successfully fetched temp report data');
    }
  } catch (e) {
    console.error('[injectContextMessages] Exception fetching temp report:', e);
  }

  // Step 2: If we have valid temp data, inject into messages table
  if (tempData?.report_content || tempData?.swiss_data) {
    console.log('[injectContextMessages] Building context message from temp data');
    
    let messageText = '';

    if (tempData.report_content) {
      messageText += `Here is my astrological report:\n\n${tempData.report_content}\n\n`;
    }

    if (tempData.swiss_data) {
      messageText += `Here is my birth chart data:\n\n${JSON.stringify(tempData.swiss_data, null, 2)}\n\n`;
    }

    if (tempData.metadata) {
      messageText += `Additional details: ${JSON.stringify(tempData.metadata, null, 2)}\n\n`;
    }

    messageText += `Please analyze this astrological information and help me understand what it means.`;

    try {
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          text: messageText.trim(),
          meta: { 
            type: 'context_injection', 
            injected_at: new Date().toISOString(),
            has_report: !!tempData.report_content,
            has_swiss_data: !!tempData.swiss_data,
            has_metadata: !!tempData.metadata
          }
        });

      if (insertError) {
        console.error('[injectContextMessages] Failed to insert report message:', insertError);
      } else {
        console.log('[injectContextMessages] ✅ Successfully injected report data into conversation');
      }
    } catch (insertErr) {
      console.error('[injectContextMessages] Exception inserting message:', insertErr);
    }
  } else {
    console.log('[injectContextMessages] No report/swiss data to inject - conversation will proceed without context');
  }
};
