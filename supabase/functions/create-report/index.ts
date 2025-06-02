
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CreateReportRequest {
  reportType: string;
  relationshipType?: string;
  essenceType?: string;
  name: string;
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  name2?: string;
  birthDate2?: string;
  birthTime2?: string;
  birthLocation2?: string;
  transitDate?: string;
  progressionDate?: string;
  returnDate?: string;
  moonDate?: string;
  positionsLocation?: string;
  positionsDate?: string;
  positionsEndDate?: string;
  todayDate?: string;
  todayTime?: string;
  notes?: string;
}

// Form validation helper
function validateFormData(data: CreateReportRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic validation
  if (!data.reportType) {
    errors.push('Report type is required');
  }
  
  // Report type specific validation
  const requiresTwoPeople = ['compatibility', 'sync'].includes(data.reportType);
  const requiresPositionsFields = data.reportType === 'positions';
  const requiresMoonDate = data.reportType === 'moonphases';
  
  if (requiresMoonDate) {
    if (!data.moonDate) {
      errors.push('Moon date is required for moonphases report');
    }
  } else if (requiresPositionsFields) {
    if (!data.positionsLocation || !data.positionsDate) {
      errors.push('Location and date are required for positions report');
    }
  } else {
    // Regular person-based reports
    if (!data.name || !data.birthDate || !data.birthTime || !data.birthLocation) {
      errors.push('Name, birth date, birth time, and birth location are required');
    }
    
    if (requiresTwoPeople) {
      if (!data.name2 || !data.birthDate2 || !data.birthTime2 || !data.birthLocation2) {
        errors.push('Second person details are required for this report type');
      }
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

// Data transformation helper
function transformToSwissFormat(data: CreateReportRequest): any {
  const basePayload: any = {
    request: data.reportType,
    user_id: null, // Will be set from auth
    api_key: null, // Will be set from auth
    auth_method: 'supabase'
  };

  // Handle different report types
  if (data.reportType === 'moonphases') {
    if (data.moonDate) {
      const year = new Date(data.moonDate).getFullYear();
      basePayload.year = year;
    }
    return basePayload;
  }

  if (data.reportType === 'positions') {
    basePayload.location = data.positionsLocation;
    basePayload.date = data.positionsDate;
    if (data.positionsEndDate) {
      basePayload.endDate = data.positionsEndDate;
    }
    return basePayload;
  }

  // Person-based reports
  basePayload.name = data.name;
  basePayload.birth_date = data.birthDate;
  basePayload.time = data.birthTime;
  basePayload.location = data.birthLocation;

  // Add today's date/time if provided
  if (data.todayDate) {
    basePayload.today_date = data.todayDate;
  }
  if (data.todayTime) {
    basePayload.today_time = data.todayTime;
  }

  // Handle specific date fields
  if (data.transitDate) {
    basePayload.transit_date = data.transitDate;
  }
  if (data.progressionDate) {
    basePayload.progression_date = data.progressionDate;
  }
  if (data.returnDate) {
    basePayload.return_date = data.returnDate;
  }

  // Handle two-person reports
  if (['compatibility', 'sync'].includes(data.reportType)) {
    basePayload.person_a = {
      name: data.name,
      birth_date: data.birthDate,
      time: data.birthTime,
      location: data.birthLocation
    };
    basePayload.person_b = {
      name: data.name2,
      birth_date: data.birthDate2,
      time: data.birthTime2,
      location: data.birthLocation2
    };
    
    // Remove individual fields for two-person reports
    delete basePayload.name;
    delete basePayload.birth_date;
    delete basePayload.time;
    delete basePayload.location;
  }

  // Handle report generation with specific report types
  if (data.reportType === 'sync' && data.relationshipType) {
    basePayload.report = `sync_${data.relationshipType}`;
  } else if (data.reportType === 'essence' && data.essenceType) {
    basePayload.report = `essence_${data.essenceType}`;
  } else {
    // For other report types, add report field if it's a report-generating endpoint
    const reportGeneratingTypes = ['return', 'essence', 'flow', 'mindset', 'monthly', 'focus'];
    if (reportGeneratingTypes.includes(data.reportType)) {
      basePayload.report = data.reportType;
    }
  }

  return basePayload;
}

// Helper to determine the report name to store
function getReportName(data: CreateReportRequest): string {
  const requiresTwoPeople = ['compatibility', 'sync'].includes(data.reportType);
  const requiresPositionsFields = data.reportType === 'positions';
  const requiresMoonDate = data.reportType === 'moonphases';
  
  if (requiresMoonDate) {
    return 'Moon Phases Report';
  }
  
  if (requiresPositionsFields) {
    return `Planetary Positions - ${data.positionsLocation}`;
  }
  
  if (requiresTwoPeople && data.name && data.name2) {
    return `${data.name} & ${data.name2}`;
  }
  
  return data.name || 'Unknown';
}

// Swiss API caller helper
async function callSwissAPI(payload: any): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('[create-report] Calling Swiss API with payload:', JSON.stringify(payload, null, 2));
    
    const response = await supabase.functions.invoke('swiss', {
      body: payload
    });

    console.log('[create-report] Swiss API response:', {
      data: response.data ? 'present' : 'missing',
      error: response.error ? response.error.message : 'none'
    });

    if (response.error) {
      return { success: false, error: response.error.message };
    }

    return { success: true, data: response.data };
  } catch (error) {
    console.error('[create-report] Error calling Swiss API:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Response handler helper
function formatResponse(swissData: any, reportType: string): any {
  return {
    success: true,
    reportType,
    data: swissData,
    generatedAt: new Date().toISOString()
  };
}

// Main orchestrator function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify user and get their data
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get user's API key
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      return new Response(JSON.stringify({ error: 'No active API key found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const formData: CreateReportRequest = await req.json();
    console.log('[create-report] Received form data:', JSON.stringify(formData, null, 2));

    // Validate form data
    const validation = validateFormData(formData);
    if (!validation.isValid) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: validation.errors 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Transform data to Swiss API format
    const swissPayload = transformToSwissFormat(formData);
    swissPayload.user_id = user.id;
    swissPayload.api_key = apiKeyData.api_key;

    console.log('[create-report] Transformed payload for Swiss API:', JSON.stringify(swissPayload, null, 2));

    // Call Swiss API
    const swissResult = await callSwissAPI(swissPayload);
    
    if (!swissResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Failed to generate report', 
        details: swissResult.error 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log to translator_logs with the report name
    const reportName = getReportName(formData);
    console.log('[create-report] Saving report with name:', reportName);

    await supabase
      .from('translator_logs')
      .insert({
        user_id: user.id,
        request_type: formData.reportType,
        request_payload: swissPayload,
        response_payload: swissResult.data,
        response_status: 200,
        report_name: reportName
      });

    // Format and return response
    const formattedResponse = formatResponse(swissResult.data, formData.reportType);
    
    return new Response(JSON.stringify(formattedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[create-report] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
