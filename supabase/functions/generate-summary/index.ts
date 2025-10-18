// @ts-nocheck - Deno runtime, types checked at deployment
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are an expert psychological behavioral analyst. Analyze the conversation between user and assistant to identify:

1. **Emotional Patterns**: What emotions are expressed? How do they change throughout the conversation?
2. **Communication Style**: How does the user communicate? Formal, casual, anxious, confident, etc.
3. **Problem-Solving Approach**: How does the user approach challenges or questions?
4. **Cognitive Patterns**: What thinking patterns emerge? Logical, intuitive, structured, scattered?
5. **Interaction Dynamics**: How does the user respond to the assistant's suggestions or information?
6. **Behavioral Indicators**: Any signs of stress, curiosity, frustration, satisfaction, etc.

Provide a concise psychological behavioral summary focusing on observable patterns rather than diagnoses. Keep it professional and objective.`;

Deno.serve(async (req) => {
  console.log(`[generate-summary] Function started, method: ${req.method}`);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Check environment variables
    console.log(`[generate-summary] SUPABASE_URL: ${SUPABASE_URL ? 'SET' : 'MISSING'}`);
    console.log(`[generate-summary] SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'}`);
    console.log(`[generate-summary] OPENAI_API_KEY: ${OPENAI_API_KEY ? 'SET' : 'MISSING'}`);
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
      throw new Error('Missing required environment variables');
    }
    const { chat_id, trigger_check = false } = await req.json();
    
    console.log(`[generate-summary] Processing chat_id: ${chat_id}, trigger_check: ${trigger_check}`);

    if (trigger_check) {
      // Check if we have enough new messages to summarize
      const shouldTrigger = await checkShouldTriggerSummary(chat_id);
      if (!shouldTrigger) {
        return new Response(JSON.stringify({ 
          triggered: false, 
          message: "Not enough new messages for summary" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get the next batch of messages to summarize
    const messagesToSummarize = await getNextMessagesToSummarize(chat_id);
    
    if (!messagesToSummarize || messagesToSummarize.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No messages to summarize" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate summary using OpenAI
    const summary = await generatePsychologicalSummary(messagesToSummarize);
    
    // Save summary to database
    await saveSummaryToDatabase(chat_id, messagesToSummarize, summary);

    console.log(`[generate-summary] Successfully created summary for chat_id: ${chat_id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Summary generated successfully",
      message_count: messagesToSummarize.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[generate-summary] Error:", error);
    console.error("[generate-summary] Error stack:", error.stack);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function checkShouldTriggerSummary(chat_id: string): Promise<boolean> {
  console.log(`[checkShouldTriggerSummary] Starting for chat_id: ${chat_id}`);
  
  // Get the latest summary for this chat
  const { data: latestSummary, error: summaryError } = await supabaseAdmin
    .from('message_block_summaries')
    .select('end_message_id, block_index')
    .eq('chat_id', chat_id)
    .order('block_index', { ascending: false })
    .limit(1);

  if (summaryError) {
    console.error(`[checkShouldTriggerSummary] Error fetching latest summary:`, summaryError);
    throw new Error(`Failed to fetch latest summary: ${summaryError.message}`);
  }

  console.log(`[checkShouldTriggerSummary] Latest summary:`, latestSummary);

  // Count new messages since last summary
  let query = supabaseAdmin
    .from('messages')
    .select('id', { count: 'exact' })
    .eq('chat_id', chat_id)
    .order('created_at', { ascending: true });

  if (latestSummary && latestSummary.length > 0) {
    // Count messages after the last summarized message
    const { data: endMessage } = await supabaseAdmin
      .from('messages')
      .select('created_at')
      .eq('id', latestSummary[0].end_message_id)
      .single();

    if (endMessage) {
      query = query.gt('created_at', endMessage.created_at);
    }
  }

  const { count, error: countError } = await query;
  
  if (countError) {
    console.error(`[checkShouldTriggerSummary] Error counting messages:`, countError);
    throw new Error(`Failed to count messages: ${countError.message}`);
  }
  
  console.log(`[checkShouldTriggerSummary] Message count: ${count}, threshold: 12`);
  
  // We need at least 12 messages (6 pairs) to trigger summary
  const shouldTrigger = (count || 0) >= 12;
  console.log(`[checkShouldTriggerSummary] Should trigger: ${shouldTrigger}`);
  
  return shouldTrigger;
}

async function getNextMessagesToSummarize(chat_id: string) {
  console.log(`[getNextMessagesToSummarize] Starting for chat_id: ${chat_id}`);
  
  // Get the latest summary to know where we left off
  const { data: latestSummary, error: summaryError } = await supabaseAdmin
    .from('message_block_summaries')
    .select('end_message_id, block_index')
    .eq('chat_id', chat_id)
    .order('block_index', { ascending: false })
    .limit(1);

  if (summaryError) {
    console.error(`[getNextMessagesToSummarize] Error fetching latest summary:`, summaryError);
    throw new Error(`Failed to fetch latest summary: ${summaryError.message}`);
  }

  console.log(`[getNextMessagesToSummarize] Latest summary:`, latestSummary);

  let query = supabaseAdmin
    .from('messages')
    .select('id, role, text, created_at')
    .eq('chat_id', chat_id)
    .order('created_at', { ascending: true })
    .limit(12); // Get 12 messages (6 pairs)

  if (latestSummary && latestSummary.length > 0) {
    // Get messages after the last summarized message
    const { data: endMessage } = await supabaseAdmin
      .from('messages')
      .select('created_at')
      .eq('id', latestSummary[0].end_message_id)
      .single();

    if (endMessage) {
      query = query.gt('created_at', endMessage.created_at);
    }
  }

  const { data: messages, error } = await query;

  if (error) {
    console.error(`[getNextMessagesToSummarize] Error fetching messages:`, error);
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  console.log(`[getNextMessagesToSummarize] Found ${messages?.length || 0} messages to summarize`);
  return messages;
}

async function generatePsychologicalSummary(messages: any[]): Promise<string> {
  console.log(`[generatePsychologicalSummary] Starting with ${messages.length} messages`);
  
  const conversationText = messages
    .map(msg => `${msg.role}: ${msg.text}`)
    .join('\n\n');

  console.log(`[generatePsychologicalSummary] Conversation text length: ${conversationText.length}`);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analyze this conversation for psychological behavioral patterns:\n\n${conversationText}` }
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[generatePsychologicalSummary] OpenAI API error: ${response.status} ${response.statusText}`);
    console.error(`[generatePsychologicalSummary] Error response: ${errorText}`);
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`[generatePsychologicalSummary] OpenAI response received, summary length: ${data.choices[0].message.content.length}`);
  return data.choices[0].message.content;
}

async function saveSummaryToDatabase(chat_id: string, messages: any[], summary: string) {
  console.log(`[saveSummaryToDatabase] Starting for chat_id: ${chat_id}, summary length: ${summary.length}`);
  
  // Get the next block index
  const { data: latestSummary, error: summaryError } = await supabaseAdmin
    .from('message_block_summaries')
    .select('block_index')
    .eq('chat_id', chat_id)
    .order('block_index', { ascending: false })
    .limit(1);

  if (summaryError) {
    console.error(`[saveSummaryToDatabase] Error fetching latest summary:`, summaryError);
    throw new Error(`Failed to fetch latest summary: ${summaryError.message}`);
  }

  const nextBlockIndex = latestSummary && latestSummary.length > 0 
    ? latestSummary[0].block_index + 1 
    : 0;

  const startMessageId = messages[0].id;
  const endMessageId = messages[messages.length - 1].id;

  const insertData = {
    chat_id,
    block_index: nextBlockIndex,
    summary,
    message_count: messages.length,
    start_message_id: startMessageId,
    end_message_id: endMessageId,
    model: 'gpt-4.1-2025-04-14',
    meta: {
      analysis_type: 'psychological_behavioral',
      message_roles: messages.map(m => m.role),
      created_by: 'auto-summary-system'
    }
  };

  console.log(`[saveSummaryToDatabase] Inserting data:`, insertData);

  const { error } = await supabaseAdmin
    .from('message_block_summaries')
    .insert(insertData);

  if (error) {
    console.error(`[saveSummaryToDatabase] Error inserting summary:`, error);
    throw new Error(`Failed to save summary: ${error.message}`);
  }

  console.log(`[saveSummaryToDatabase] Successfully saved summary with block_index: ${nextBlockIndex}`);
}