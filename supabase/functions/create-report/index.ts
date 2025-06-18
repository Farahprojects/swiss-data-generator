
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
  client_id?: string;
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

// Data transformation helper - creates payload for Swiss edge function
function transformToSwissFormat(data: CreateReportRequest): any {
  const basePayload: any = {
    request: data.reportType,
    user_id: '', // Will be set later
    api_key: '', // Will be set later
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
    // Map essence types correctly
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

  // Add client_id if provided
  if (data.client_id) {
    basePayload.client_id = data.client_id;
  }

  return basePayload;
}

// Swiss edge function caller - calls our swiss function instead of external API
async function callSwissFunction(payload: any, userId: string, apiKey: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('[create-report] Calling Swiss edge function with payload:', JSON.stringify(payload, null, 2));
    console.log('[create-report] Using user_id:', userId);
    console.log('[create-report] Using api_key:', apiKey.substring(0, 10) + '...');
    
    // Set the user credentials in the payload
    payload.user_id = userId;
    payload.api_key = apiKey;
    
    // Call our Swiss edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/swiss`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    console.log('[create-report] Swiss function response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('[create-report] Swiss function error response:', errorText);
      return { success: false, error: `Swiss function error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    console.log('[create-report] Swiss function response received successfully');

    return { success: true, data: data };
  } catch (error) {
    console.error('[create-report] Error calling Swiss function:', error);
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
    // Use direct API key authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'API key required in Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const apiKey = authHeader.replace('Bearer ', '');

    // Validate API key directly against api_keys table
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('user_id, api_key')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = apiKeyData.user_id;

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

    // Transform data for Swiss function
    const swissPayload = transformToSwissFormat(formData);
    console.log('[create-report] Payload for Swiss function:', JSON.stringify(swissPayload, null, 2));

    // Call Swiss edge function (which will handle translator and report orchestrator)
    const swissResult = await callSwissFunction(swissPayload, userId, apiKey);
    
    if (!swissResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Failed to generate report', 
        details: swissResult.error 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
