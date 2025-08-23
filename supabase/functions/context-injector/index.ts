import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Utility function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

serve(async (req) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[context-injector][${requestId}] 🚀 Context injection started at ${new Date().toISOString()}`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[context-injector] Missing environment variables");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Server configuration error",
          timestamp: new Date().toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log(`[context-injector][${requestId}] Request body received:`, { keys: Object.keys(requestBody) });
      
      // Warm-up check
      if (requestBody?.warm === true) {
        return new Response("Warm-up", { status: 200, headers: corsHeaders });
      }
    } catch (parseError) {
      console.error(`[context-injector][${requestId}] Failed to parse JSON:`, parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid JSON in request body",
          timestamp: new Date().toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { guest_report_id } = requestBody;

    // Validate guest_report_id
    if (!guest_report_id || typeof guest_report_id !== 'string' || !isValidUUID(guest_report_id)) {
      console.error(`[context-injector][${requestId}] Invalid guest_report_id format:`, guest_report_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "guest_report_id must be a valid UUID",
          timestamp: new Date().toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[context-injector][${requestId}] 📋 Processing context injection for: ${guest_report_id}`);

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, get the chat_id from guest_reports
    console.log(`[context-injector][${requestId}] 🔍 Fetching chat_id from guest_reports...`);
    const { data: guestReport, error: guestError } = await supabase
      .from("guest_reports")
      .select("id, chat_id, email, report_type, is_ai_report, created_at, payment_status, report_data")
      .eq("id", guest_report_id)
      .single();

    if (guestError || !guestReport) {
      console.error(`[context-injector][${requestId}] Guest report not found:`, guestError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Guest report not found",
          timestamp: new Date().toISOString()
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { chat_id } = guestReport;
    if (!chat_id) {
      console.error(`[context-injector][${requestId}] No chat_id found for guest:`, guest_report_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No chat_id found for guest report",
          timestamp: new Date().toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[context-injector][${requestId}] 🎯 Target chat_id: ${chat_id}`);

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

    // Get report data if it exists
    console.log(`[context-injector][${requestId}] 🔍 Fetching report data...`);
    const { data: reportLogs } = await supabase
      .from("report_logs")
      .select("report_text")
      .eq("user_id", guest_report_id)
      .single();

    // Get Swiss data if it exists  
    const { data: translatorLogs } = await supabase
      .from("translator_logs")
      .select("swiss_data")
      .eq("user_id", guest_report_id)
      .single();

    // Helper function to extract user-relevant content from report text
    function extractUserContent(reportText: string): string {
      // Remove technical metadata and calculation engine info
      let cleanText = reportText;
      
      // Remove common technical prefixes and metadata
      const technicalPatterns = [
        /^.*?calculation engine.*?$/gmi,
        /^.*?time basis.*?$/gmi,
        /^.*?processing time.*?$/gmi,
        /^.*?token count.*?$/gmi,
        /^.*?model.*?$/gmi,
        /^.*?temperature.*?$/gmi,
        /^.*?max tokens.*?$/gmi,
        /^.*?engine used.*?$/gmi,
        /^.*?metadata.*?$/gmi,
        /^.*?duration.*?$/gmi,
        /^.*?latency.*?$/gmi,
        /^.*?cost.*?$/gmi,
        /^.*?status.*?$/gmi
      ];
      
      technicalPatterns.forEach(pattern => {
        cleanText = cleanText.replace(pattern, '');
      });
      
      // Remove empty lines and clean up
      cleanText = cleanText.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
      
      return cleanText;
    }
    
    // Helper function to extract user-relevant data from Swiss data
    function extractUserSwissData(swissData: any): any {
      if (!swissData || typeof swissData !== 'object') {
        return swissData;
      }
      
      // Create a clean copy without technical metadata
      const cleanData: any = {};
      
      // Only include user-relevant fields
      const userRelevantFields = [
        'report', 'content', 'narrative', 'text', 'title',
        'subjects', 'person_a', 'person_b', 'natal', 'transits',
        'compatibility', 'synastry', 'essence', 'flow', 'mindset'
      ];
      
      for (const [key, value] of Object.entries(swissData)) {
        if (userRelevantFields.includes(key) || 
            (typeof value === 'string' && value.length > 50) ||
            (typeof value === 'object' && value !== null)) {
          cleanData[key] = value;
        }
      }
      
      return cleanData;
    }
    
    // Build context with filtered user-relevant data only
    let contextContent = "";
    
    if (reportLogs?.report_text) {
      const userContent = extractUserContent(reportLogs.report_text);
      if (userContent.trim()) {
        contextContent += `REPORT CONTENT:\n${userContent}`;
      }
    }
    
    if (translatorLogs?.swiss_data) {
      const userSwissData = extractUserSwissData(translatorLogs.swiss_data);
      if (Object.keys(userSwissData).length > 0) {
        if (contextContent) contextContent += "\n\n";
        contextContent += `SWISS ENERGETIC DATA:\n${JSON.stringify(userSwissData, null, 2)}`;
      }
    }

    console.log(`[context-injector][${requestId}] 💉 Injecting context message (${contextContent.length} chars)...`);

    // Insert the context message as a system message (invisible to UI)
    const { data: contextMessage, error: insertError } = await supabase
      .from("messages")
      .insert({
        chat_id,
        role: "system", // System messages are typically hidden from UI
        text: contextContent,
        status: "complete",
        context_injected: true,
        meta: {
          guest_report_id,
          has_report: !!reportLogs?.report_text,
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
          has_report: !!reportLogs?.report_text,
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
