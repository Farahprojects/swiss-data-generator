import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


Deno.serve(async (req) => {
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

        const { chat_id, mode, report_text, injection_type } = requestBody;

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

    // Mode validation
    if (!mode || typeof mode !== 'string') {
      console.error(`[context-injector][${requestId}] Invalid mode:`, mode);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "mode is required",
          timestamp: new Date().toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[context-injector][${requestId}] 📋 Processing context injection for chat_id: ${chat_id}, injection_type: ${injection_type || 'swiss_data'}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Determine injection type and build appropriate context
    let contextContent = "";
    let contextType = injection_type || 'swiss_data';
    
    if (injection_type === 'report' && report_text) {
      // Called from standard-report engines - inject report text
      console.log(`[context-injector][${requestId}] 📄 Injecting report text (${report_text.length} chars)...`);
      contextContent = `AI Report generated for this conversation:\n\n${report_text}`;
    } else {
      // Called from translator-edge - inject Swiss data (original behavior)
      console.log(`[context-injector][${requestId}] 🔍 Fetching Swiss data...`);
      const { data: translatorLogs } = await supabase
        .from("translator_logs")
        .select("swiss_data")
        .eq("chat_id", chat_id)
        .single();

      if (translatorLogs?.swiss_data) {
        contextContent = `Astro data available for this conversation:\n${JSON.stringify(translatorLogs.swiss_data, null, 2)}`;
      } else {
        contextContent = "Astro data context injected for this conversation.";
      }
    }

    // Check if this specific context type has already been injected
    console.log(`[context-injector][${requestId}] 🔍 Checking if ${contextType} context already injected...`);
    const { data: existingContext } = await supabase
      .from("messages")
      .select("id")
      .eq("chat_id", chat_id)
      .eq("context_injected", true)
      .eq("meta->>injection_type", contextType)
      .limit(1);

    if (existingContext && existingContext.length > 0) {
      console.log(`[context-injector][${requestId}] ✅ ${contextType} context already injected for chat_id: ${chat_id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `${contextType} context already injected`,
          chat_id,
          injection_type: contextType,
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[context-injector][${requestId}] 💉 Injecting ${contextType} context message (${contextContent.length} chars)...`);

    // Insert the context message as a system message (invisible to UI)
    const { data: contextMessage, error: insertError } = await supabase
      .from("messages")
      .insert({
        chat_id,
        role: "system",
        text: contextContent,
        status: "complete",
        context_injected: true,
        mode: mode,
        meta: {
          injection_type: contextType,
          has_swiss_data: contextType === 'swiss_data',
          has_report_text: contextType === 'report',
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
    console.log(`[context-injector][${requestId}] ✅ ${contextType} context injected successfully in ${processingTime}ms`);
    console.log(`[context-injector][${requestId}] 📝 Message ID: ${contextMessage.id}, Chat ID: ${chat_id}`);
    
    // Fire-and-forget insights table update - mark report as ready
    // Only for report injection (not swiss_data)
    if (injection_type === 'report' && chat_id) {
      console.log(`[context-injector][${requestId}] Updating insights table for chat_id: ${chat_id}`);
      supabase.from("insights")
        .update({ 
          is_ready: true,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', chat_id) // chat_id = insight_id for insights reports
        .then(({ error }) => {
          if (error) {
            console.error(`[context-injector][${requestId}] Insights update failed:`, error);
          } else {
            console.log(`[context-injector][${requestId}] Insights table updated successfully`);
          }
        });
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: `${contextType} context successfully injected`,
        data: {
          message_id: contextMessage.id,
          chat_id,
          injection_type: contextType,
          content_length: contextContent.length,
          has_swiss_data: contextType === 'swiss_data',
          has_report_text: contextType === 'report',
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
