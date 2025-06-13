
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&deno-std=0.224.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { guestReportId } = await req.json();

    console.log("🔍 Processing Swiss ephemeris for guest report:", guestReportId);

    if (!guestReportId) {
      console.error("❌ No guest report ID provided");
      throw new Error("Guest report ID is required");
    }

    // Initialize Supabase with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false } }
    );

    // Get the guest report data
    const { data: guestReport, error: fetchError } = await supabase
      .from("guest_reports")
      .select("*")
      .eq("id", guestReportId)
      .single();

    if (fetchError || !guestReport) {
      console.error("❌ Error fetching guest report:", fetchError);
      throw new Error("Guest report not found");
    }

    console.log("📋 Found guest report:", {
      id: guestReport.id,
      reportType: guestReport.report_type,
      email: guestReport.email
    });

    // Extract birth data from report_data
    const reportData = guestReport.report_data || {};
    const birthDate = reportData.birthDate;
    const birthLatitude = reportData.birthLatitude;
    const birthLongitude = reportData.birthLongitude;

    if (!birthDate || !birthLatitude || !birthLongitude) {
      console.error("❌ Missing required birth data:", {
        birthDate: !!birthDate,
        birthLatitude: !!birthLatitude,
        birthLongitude: !!birthLongitude
      });
      throw new Error("Missing required birth data (date, latitude, longitude)");
    }

    // Prepare payload for Swiss ephemeris
    const swissPayload = {
      request: guestReport.report_type,
      birth_day: birthDate,
      latitude: birthLatitude,
      longitude: birthLongitude
    };

    console.log("🚀 Sending payload to Swiss ephemeris:", swissPayload);

    // Call Swiss ephemeris API
    const swissResponse = await fetch(Deno.env.get("SWISS_EPHEMERIS_URL") || "", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(swissPayload),
    });

    if (!swissResponse.ok) {
      console.error("❌ Swiss ephemeris API error:", swissResponse.status, swissResponse.statusText);
      throw new Error(`Swiss ephemeris API error: ${swissResponse.status}`);
    }

    const swissData = await swissResponse.json();
    console.log("✅ Received Swiss ephemeris data");

    // Save Swiss data to guest_reports table
    const { error: updateError } = await supabase
      .from("guest_reports")
      .update({ swiss_data: swissData })
      .eq("id", guestReportId);

    if (updateError) {
      console.error("❌ Error saving Swiss data:", updateError);
      throw new Error("Failed to save Swiss ephemeris data");
    }

    console.log("✅ Swiss data saved successfully to guest report:", guestReportId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Swiss ephemeris data processed and saved",
        guestReportId: guestReportId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("❌ Swiss ephemeris processing failed:", {
      message: error.message,
      stack: error.stack
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
