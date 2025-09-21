import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


serve(async (req) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  // Context injector for authenticated users - simplified version
  console.log(`[context-injector][${requestId}] 🚀 Context injection started at ${new Date().toISOString()}`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestBody = await req.json();
    console.log(`[context-injector][${requestId}] Request body received:`, { keys: Object.keys(requestBody) });
    
    // Warm-up check
    if (requestBody?.warm === true) {
      return new Response("Warm-up", { status: 200, headers: corsHeaders });
    }

    const { chat_id } = requestBody;

    // Basic chat_id validation
    if (!chat_id || typeof chat_id !== 'string') {
      console.error(`[context-injector][${requestId}] Invalid chat_id:`, chat_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "chat_id is required",
          timestamp: new Date().toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[context-injector][${requestId}] 📋 Processing context injection for chat_id: ${chat_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Check if context has already been injected for this chat_id
    console.log(`[context-injector][${requestId}] 🔍 Checking if context already injected...`);
    const { data: existingContext } = await supabase
      .from("messages")
      .select("id")
      .eq("chat_id", chat_id)
      .eq("context_injected", true)
      .limit(1);

    if (existingContext && existingContext.length > 0) {
      console.log(`[context-injector][${requestId}] ✅ Context already injected for chat_id: ${chat_id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Context already injected",
          chat_id,
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Swiss data and mode if it exists
    console.log(`[context-injector][${requestId}] 🔍 Fetching Swiss data...`);
    const { data: translatorLogs } = await supabase
      .from("translator_logs")
      .select("swiss_data, mode")
      .eq("user_id", chat_id)
      .single();

    // Build context content
    let contextContent = "";
    
    if (translatorLogs?.swiss_data) {
      contextContent = `Astro data available for this conversation:\n${JSON.stringify(translatorLogs.swiss_data, null, 2)}`;
    } else {
      contextContent = "Astro data context injected for this conversation.";
    }

    console.log(`[context-injector][${requestId}] 💉 Injecting context message (${contextContent.length} chars)...`);

    // Insert the context message as a system message (invisible to UI)
    const { data: contextMessage, error: insertError } = await supabase
      .from("messages")
      .insert({
        chat_id,
        role: "system",
        text: contextContent,
        status: "complete",
        context_injected: true,
        mode: translatorLogs?.mode || 'chat',
        meta: {
          has_swiss_data: !!translatorLogs?.swiss_data,
          injection_timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error(`[context-injector][${requestId}] Failed to inject context:`, insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to inject context into messages",
          details: insertError.message,
          timestamp: new Date().toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const processingTime = Date.now() - startTime;
    console.log(`[context-injector][${requestId}] ✅ Context injected successfully in ${processingTime}ms`);
    console.log(`[context-injector][${requestId}] 📝 Message ID: ${contextMessage.id}, Chat ID: ${chat_id}`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Context successfully injected",
        data: {
          message_id: contextMessage.id,
          chat_id,
          content_length: contextContent.length,
          has_swiss_data: !!translatorLogs?.swiss_data,
          processing_time_ms: processingTime
        },
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[context-injector][${requestId}] Unexpected error:`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error",
        details: error.message,
        processing_time_ms: processingTime,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
