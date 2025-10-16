

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

// Generate secure tokens
async function generateSecureTokens() {
  const plainToken = crypto.randomUUID();
  const chatHash = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  
  // Create SHA-256 hash of the plain token
  const encoder = new TextEncoder();
  const data = encoder.encode(plainToken);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return {
    plainToken,
    tokenHash,
    chatHash
  };
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  console.log(`[create-temp-report-data] Request started at ${new Date().toISOString()}`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[create-temp-report-data] Missing environment variables");
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
      console.log("[create-temp-report-data] Request body received:", { keys: Object.keys(requestBody) });
    } catch (parseError) {
      console.error("[create-temp-report-data] Failed to parse JSON:", parseError);
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
      console.error("[create-temp-report-data] Invalid guest_report_id format:", guest_report_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "guest_report_id must be a valid UUID",
          timestamp: new Date().toISOString()
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[create-temp-report-data] Processing temp data creation for: ${guest_report_id}`);

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if temp data already exists
    const { data: existingTempData, error: checkError } = await supabase
      .from("temp_report_data")
      .select("id")
      .eq("guest_report_id", guest_report_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("[create-temp-report-data] Error checking existing temp data:", checkError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Database error while checking existing temp data",
          details: checkError.message,
          timestamp: new Date().toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingTempData) {
      console.log(`[create-temp-report-data] Temp data already exists for: ${guest_report_id}, fetching existing data...`);
      
      // Fetch the existing temp data to get the tokens
      const { data: existingData, error: fetchError } = await supabase
        .from("temp_report_data")
        .select("id, plain_token, chat_hash, expires_at")
        .eq("guest_report_id", guest_report_id)
        .single();
        
      if (fetchError || !existingData) {
        console.error("[create-temp-report-data] Error fetching existing temp data:", fetchError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Failed to fetch existing temp data",
            details: fetchError?.message,
            timestamp: new Date().toISOString()
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log(`[create-temp-report-data] ✅ Returning existing temp data:`, {
        temp_data_id: existingData.id,
        has_plain_token: !!existingData.plain_token,
        has_chat_hash: !!existingData.chat_hash
      });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Temp data already exists",
          temp_data_id: existingData.id,
          plain_token: existingData.plain_token,
          chat_hash: existingData.chat_hash,
          expires_at: existingData.expires_at,
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the guest report with related data
    console.log("[create-temp-report-data] Fetching guest report data...");
    const { data: guestReport, error: fetchError } = await supabase
      .from("guest_reports")
      .select("*")
      .eq("id", guest_report_id)
      .single();

    if (fetchError) {
      console.error("[create-temp-report-data] Database error:", fetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Database error while fetching guest report",
          details: fetchError.message,
          timestamp: new Date().toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!guestReport) {
      console.warn("[create-temp-report-data] Guest report not found:", guest_report_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Guest report not found",
          timestamp: new Date().toISOString()
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch related data separately using user_id = guest_report_id
    let reportLogData: { report_text: string } | null = null;
    let translatorLogData: { swiss_data: any } | null = null;

    // Fetch report log using user_id = guest_report_id  
    const { data: reportLog, error: reportLogError } = await supabase
      .from("report_logs")
      .select("report_text")
      .eq("user_id", guest_report_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (!reportLogError && reportLog) {
      reportLogData = reportLog as { report_text: string };
    } else {
      console.warn(`[create-temp-report-data] Could not fetch report_log for user_id ${guest_report_id}:`, reportLogError);
    }

    // Fetch translator log using user_id = guest_report_id
    const { data: translatorLog, error: translatorLogError } = await supabase
      .from("translator_logs")
      .select("swiss_data")
      .eq("user_id", guest_report_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (!translatorLogError && translatorLog) {
      translatorLogData = translatorLog as { swiss_data: any };
    } else {
      console.warn(`[create-temp-report-data] Could not fetch translator_log for user_id ${guest_report_id}:`, translatorLogError);
    }

    // Generate secure tokens
    const { plainToken, tokenHash, chatHash } = await generateSecureTokens();

    // Prepare data for temp_report_data
    const reportContent = reportLogData?.report_text || null;
    const swissData = translatorLogData?.swiss_data || null;
    const reportName = guestReport.report_data?.name || 'Guest Report';

    const metadata = {
      report_type: guestReport.report_type,
      report_data_name: reportName,
      has_report: true,
      content_type: guestReport.swiss_boolean && guestReport.is_ai_report ? 'both' : 
                   guestReport.swiss_boolean ? 'astro' : 
                   guestReport.is_ai_report ? 'ai' : 'none',
      has_ai_report: !!guestReport.is_ai_report,
      has_swiss_data: !!swissData,
      customer_email: guestReport.email,
    };

    // Calculate expiration (72 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    // Insert into temp_report_data
    console.log("[create-temp-report-data] Creating temp report data...");
    const { data: tempData, error: insertError } = await supabase
      .from("temp_report_data")
      .insert({
        guest_report_id: guest_report_id,
        report_content: reportContent,
        swiss_data: swissData,
        metadata: metadata,
        plain_token: plainToken,
        token_hash: tokenHash,
        chat_hash: chatHash,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error("[create-temp-report-data] Error inserting temp data:", insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Database error while creating temp data",
          details: insertError.message,
          timestamp: new Date().toISOString()
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Non-blocking post-processing ---
    // This runs after the main response is sent to the client.
    const runPostProcessing = async () => {
      try {
        const { error: invokeError } = await supabase.functions.invoke('process-guest-report-pdf', {
          body: { guest_report_id: guest_report_id }
        });

        if (invokeError) throw invokeError;

        const { error: updateError } = await supabase
          .from('guest_reports')
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .eq('id', guest_report_id);

        if (updateError) throw updateError;

      } catch (e) {
        console.error(`[create-temp-report-data] Non-blocking email process failed for ${guest_report_id}:`, e);
        await supabase.from('user_errors').insert({
            guest_report_id: guest_report_id,
            error_type: 'EMAIL_AUTOMATION_FAILURE',
            error_message: e.message,
            metadata: { function: 'create-temp-report-data' }
        });
      }
    };
    
    // Fire the post-processing without waiting for it to complete
    runPostProcessing().catch(console.error);
    
    const processingTime = Date.now() - startTime;
    console.log(`[create-temp-report-data] Successfully created temp data for: ${guest_report_id} in ${processingTime}ms`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        temp_data_id: tempData.id,
        plain_token: plainToken,
        chat_hash: chatHash,
        expires_at: expiresAt.toISOString(),
        processing_time_ms: processingTime,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("[create-temp-report-data] Unexpected error:", error);
    
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
