import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const mappedReport = await req.json();
    
    console.log('Storing temp report data for ChatGPT integration');

    // Store the report data in temp_report_data table
    const { data, error } = await supabase
      .from('temp_report_data')
      .insert({
        report_content: mappedReport.reportContent,
        swiss_data: mappedReport.swissData,
        metadata: {
          people: mappedReport.people,
          reportType: mappedReport.reportType,
          title: mappedReport.title,
          customerName: mappedReport.customerName,
          isRelationship: mappedReport.isRelationship,
          isPureAstroReport: mappedReport.isPureAstroReport,
          hasReport: mappedReport.hasReport,
          swissBoolean: mappedReport.swissBoolean
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error storing temp report data:', error);
      return new Response(JSON.stringify({ error: 'Failed to store report data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully stored temp report data with UUID:', data.id);

    return new Response(JSON.stringify({ uuid: data.id, success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in store-temp-report function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});