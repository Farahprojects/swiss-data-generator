// src/services/api/conversations.ts
import { supabase } from '@/integrations/supabase/client';
import { Conversation } from '@/core/types';
import { getGuestId } from '../auth/session';

export const createConversation = async (reportId?: string): Promise<Conversation> => {
  const guestId = getGuestId();
  console.log('[createConversation] Called with reportId:', reportId, 'using guestId from session:', guestId);
  
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
    return { conversationId: existing.id };
  }

  // Create new conversation
  console.log('[getOrCreateConversation] Creating new conversation with uuid:', uuid);
  
  // Log the exact values being inserted
  const insertData = { guest_id: uuid, report_id: uuid }; // Using uuid for both since they're the same in our system
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
  console.log('[injectContextMessages] Fetching temp report data for uuid:', uuid, 'with secure token');
  
  try {
    // Use the retrieve-temp-report Edge Function with secure tokens
    const { data: tempData, error: tempError } = await supabase.functions.invoke('retrieve-temp-report', {
      body: { 
        uuid: uuid,
        token: token // Now using the secure token
      }
    });

    if (tempError) {
      console.error('[injectContextMessages] Error calling retrieve-temp-report:', tempError);
      // Don't throw - conversation should still work without context
      return;
    }

    if (!tempData || tempData.error) {
      console.log('[injectContextMessages] No temp_report_data found for uuid:', uuid, 'error:', tempData?.error);
      return;
    }
  } catch (error) {
    console.error('[injectContextMessages] Exception calling retrieve-temp-report:', error);
    return;
  }

  const systemMessages = [];

  // Add Swiss data as first system message if present
  if (tempData.swiss_data) {
    console.log('[injectContextMessages] Adding Swiss data as system message');
    systemMessages.push({
      conversation_id: conversationId,
      role: 'system',
      text: `Swiss Ephemeris Data: ${JSON.stringify(tempData.swiss_data)}`,
      meta: { type: 'swiss_data', injected_at: new Date().toISOString() }
    });
  }

  // Add report data as second system message if present (from report_content)
  if (tempData.report_content) {
    console.log('[injectContextMessages] Adding report content as system message');
    systemMessages.push({
      conversation_id: conversationId,
      role: 'system', 
      text: `Astrological Report: ${tempData.report_content}`,
      meta: { type: 'report_content', injected_at: new Date().toISOString() }
    });
  }

  // Insert system messages if we have any
  if (systemMessages.length > 0) {
    const { error: insertError } = await supabase
      .from('messages')
      .insert(systemMessages);

    if (insertError) {
      console.error('[injectContextMessages] Error inserting system messages:', insertError);
      // Don't throw - conversation should still work
    } else {
      console.log(`[injectContextMessages] Successfully inserted ${systemMessages.length} system messages`);
    }
  } else {
    console.log('[injectContextMessages] No context data to inject');
  }
};
