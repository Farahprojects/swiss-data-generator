import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

interface AuthReportRequest {
  chat_id: string;
  report_id?: string; // Optional report_id for insights reports
  report_data: {
    request: string;
    reportType: string;
    person_a: {
      birth_date: string;
      birth_time: string;
      location: string;
      latitude?: number;
      longitude?: number;
      name: string;
      timezone?: string;
      house_system?: string;
    };
    person_b?: {
      birth_date: string;
      birth_time: string;
      location: string;
      latitude?: number;
      longitude?: number;
      name: string;
      timezone?: string;
      house_system?: string;
    };
  };
  email: string;
  name: string;
  mode: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { chat_id, report_id, report_data, email, name, mode } = await req.json() as AuthReportRequest;
    
    console.log(`🔄 [initiate-auth-report] Processing request for chat_id: ${chat_id}, report_id: ${report_id}`);

    if (!chat_id || !report_data) {
      return new Response(JSON.stringify({ error: "chat_id and report_data are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Initialize Supabase client with service role for JWT verification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Step 1: Verify JWT and get user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    
    if (userErr || !userRes.user) {
      console.error(`❌ [initiate-auth-report] JWT verification failed:`, userErr);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const user = userRes.user;
    console.log(`✅ [initiate-auth-report] JWT verified for user: ${user.id}`);

    // Step 2: Determine context ID and flow type
    let actualChatId = chat_id;
    let isUserProfile = false;
    let isInsightsReport = false;
    
    // Check if this is an insights report with a report_id
    if (report_id) {
      console.log(`🔄 [initiate-auth-report] Using report_id for insights report: ${report_id}`);
      isInsightsReport = true;
      actualChatId = report_id; // Use report_id as context_id for insights
    }
    // Check if the chat_id is actually a user_id (from profile page)
    else if (chat_id === user.id) {
      console.log(`🔄 [initiate-auth-report] chat_id matches user_id - profile page flow`);
      isUserProfile = true;
      actualChatId = user.id; // Use user_id directly for profile reports
    } else {
      // Verify the conversation belongs to this user (chat flow)
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .select("id, user_id")
        .eq("id", chat_id)
        .eq("user_id", user.id)
        .single();

      if (convError || !conversation) {
        console.error(`❌ [initiate-auth-report] Conversation not found or access denied: ${chat_id}`, convError);
        return new Response(JSON.stringify({ error: "Conversation not found or access denied" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      console.log(`✅ [initiate-auth-report] Conversation verified: ${chat_id}`);
    }

    // Step 3: Build translator-edge payload
    const translatorPayload = {
      ...report_data,
      user_id: isInsightsReport ? actualChatId : user.id, // Use report_id for insights, user_id for other flows
      context_id: actualChatId, // Pass report_id, chat_id, or user_id for context
      request_id: crypto.randomUUID().slice(0, 8),
      email: email,
      name: name,
      mode: mode
    };

    console.log(`🔄 [initiate-auth-report] Built translator payload for: ${chat_id}`);

    // Step 4: Fire-and-forget call to translator-edge
    EdgeRuntime.waitUntil(
      supabase.functions.invoke('translator-edge', {
        body: translatorPayload
      }).catch((error) => {
        console.error(`❌ [initiate-auth-report] Translator-edge failed: ${chat_id}`, error);
      })
    );

    // Step 5: If profile flow or insights report, mark profile setup as completed
    if (isUserProfile || isInsightsReport) {
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ has_profile_setup: true, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (profileErr) {
        console.error('❌ [initiate-auth-report] Failed to mark profile setup complete:', profileErr);
      } else {
        console.log('✅ [initiate-auth-report] Marked has_profile_setup=true for user:', user.id);
      }
    }

    // Step 6: Save form details to conversations.meta (only for chat flows)
    if (!isUserProfile) {
      const { error: metaError } = await supabase
        .from("conversations")
        .update({
          meta: {
            last_report_form: {
              request: report_data.request,
              reportType: report_data.reportType,
              person_a: report_data.person_a,
              person_b: report_data.person_b,
              email: email,
              name: name,
              submitted_at: new Date().toISOString()
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq("id", chat_id);

      if (metaError) {
        console.error(`❌ [initiate-auth-report] Failed to save form meta: ${chat_id}`, metaError);
        // Don't fail the request, just log the error
      } else {
        console.log(`✅ [initiate-auth-report] Form meta saved for: ${chat_id}`);
      }
    } else {
      console.log(`✅ [initiate-auth-report] Skipping conversation meta save for profile flow`);
    }

    console.log(`✅ [initiate-auth-report] Successfully processed: ${chat_id}`);

    return new Response(JSON.stringify({
      success: true,
      chat_id,
      message: "Astro data submitted successfully",
      user_id: user.id,
      flow_type: isUserProfile ? 'profile' : 'chat'
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error(`❌ [initiate-auth-report] Unexpected error:`, error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
