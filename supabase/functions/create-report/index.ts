//
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
  client_id?: string; // Add client_id parameter
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

// Data transformation helper - creates clean payload that matches exact curl format
function transformToSwissFormat(data: CreateReportRequest): any {
  const basePayload: any = {
    request: data.reportType,  // CRITICAL: Add the request field that Swiss API requires
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

  // Person-based reports - Map form fields to Swiss API field names
  basePayload.name = data.name;
  basePayload.birth_date = data.birthDate;
  basePayload.time = data.birthTime;  // Map birthTime → time
  basePayload.location = data.birthLocation;  // Map birthLocation → location

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
      time: data.birthTime,  // Map birthTime → time
      location: data.birthLocation  // Map birthLocation → location
    };
    basePayload.person_b = {
      name: data.name2,
      birth_date: data.birthDate2,
      time: data.birthTime2,  // Map birthTime2 → time
      location: data.birthLocation2  // Map birthLocation2 → location
    };
    
    // Remove individual fields for two-person reports
    delete basePayload.name;
    delete basePayload.birth_date;
    delete basePayload.time;
    delete basePayload.location;
  }

  // Handle astro data types (no AI report generation)
  if (data.reportType === 'essence-bundle' || data.reportType === 'sync-rich') {
    // Don't add report field for raw data requests
    return basePayload;
  }

  // Handle report generation with specific report types
  if (data.reportType === 'sync' && data.relationshipType) {
    basePayload.report = `sync_${data.relationshipType}`;
  } else if (data.reportType === 'essence' && data.essenceType) {
    // CRITICAL FIX: Map essence types correctly
    if (data.essenceType === 'personal-identity') {
      basePayload.report = 'essence_personal';
    } else if (data.essenceType === 'professional') {
      basePayload.report = 'essence_professional';
    } else if (data.essenceType === 'relational') {
      basePayload.report = 'essence_relational';
    } else {
      basePayload.report = `essence_${data.essenceType}`;
    }
  } else {
    // For other report types, add report field if it's a report-generating endpoint
    const reportGeneratingTypes = ['return', 'essence', 'flow', 'mindset', 'monthly', 'focus'];
    if (reportGeneratingTypes.includes(data.reportType)) {
      basePayload.report = data.reportType;
    }
  }

  return basePayload;
}

// Helper to determine the report name to store - simplified to just names
function getReportName(data: CreateReportRequest, reportTier?: string): string {
  const requiresTwoPeople = ['compatibility', 'sync'].includes(data.reportType);
  const requiresPositionsFields = data.reportType === 'positions';
  const requiresMoonDate = data.reportType === 'moonphases';
  
  if (requiresMoonDate) {
    return 'Moon Phases Report';
  }
  
  if (requiresPositionsFields) {
    return `Planetary Positions - ${data.positionsLocation}`;
  }
  
  // Just return the person's name(s)
  if (requiresTwoPeople && data.name && data.name2) {
    return `${data.name} & ${data.name2}`;
  } else if (data.name) {
    return data.name;
  } else {
    return 'Unknown';
  }
}

// Swiss API caller helper - sends clean payload with auth in headers like curl
async function callSwissAPI(payload: any, userId: string, apiKey: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('[create-report] Calling Swiss API with clean payload:', JSON.stringify(payload, null, 2));
    console.log('[create-report] Using user_id:', userId);
    console.log('[create-report] Using api_key:', apiKey.substring(0, 10) + '...');
    
    // Make direct HTTP request to Swiss function with API key in Authorization header (like curl)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const response = await fetch(`${supabaseUrl}/functions/v1/swiss`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    console.log('[create-report] Swiss API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('[create-report] Swiss API error response:', errorText);
      return { success: false, error: `Swiss API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    console.log('[create-report] Swiss API response:', {
      data: data ? 'present' : 'missing',
      success: data ? true : false
    });

    return { success: true, data: data };
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
Deno.serve(async (req) => {
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

    // Transform data to clean Swiss API format (like curl) with skip_logging flag
    const cleanPayload = transformToSwissFormat(formData);
    console.log('[create-report] Clean payload for Swiss API:', JSON.stringify(cleanPayload, null, 2));

    // Call Swiss API with clean payload and API key in headers (like curl)
    const swissResult = await callSwissAPI(cleanPayload, user.id, apiKeyData.api_key);
    
    if (!swissResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Failed to generate report', 
        details: swissResult.error 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log to translator_logs with the report name and client_id using the report_tier
    const reportName = getReportName(formData, cleanPayload.report);
    console.log('[create-report] Saving report with name:', reportName);

    const translatorLogData: any = {
      user_id: user.id,
      request_type: formData.reportType,
      request_payload: cleanPayload,
      swiss_data: swissResult.data,
      response_status: 200,
      report_tier: cleanPayload.report
    };

    // Add client_id if provided
    if (formData.client_id) {
      translatorLogData.client_id = formData.client_id;
      console.log('[create-report] Saving with client_id:', formData.client_id);
    }

    const { data: translatorLog, error: translatorLogError } = await supabase
      .from('translator_logs')
      .insert(translatorLogData)
      .select()
      .single();

    if (translatorLogError) {
      console.error('[create-report] Error saving translator log:', translatorLogError);
    }

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
