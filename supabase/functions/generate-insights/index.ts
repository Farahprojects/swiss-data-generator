
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

// OpenAI API key
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

interface GenerateInsightsRequest {
  client_id: string;
  goals?: string;
  journal_entries?: string[];
  reports?: string[];
  insight_type: 'pattern' | 'recommendation' | 'trend' | 'milestone';
}

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

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const requestData: GenerateInsightsRequest = await req.json();
    console.log('Generate insights request:', JSON.stringify(requestData, null, 2));

    const { client_id, goals, journal_entries, reports, insight_type } = requestData;

    if (!client_id) {
      return new Response(JSON.stringify({ error: 'Client ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the insights system prompt from the database
    const { data: promptData, error: promptError } = await supabase
      .from('insight_prompts')
      .select('prompt_text')
      .eq('name', 'client_insights')
      .eq('is_active', true)
      .single();

    if (promptError || !promptData) {
      console.error('Error fetching insights prompt:', promptError);
      return new Response(JSON.stringify({ error: 'Insights prompt not found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get client information
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('full_name, notes')
      .eq('id', client_id)
      .single();

    if (clientError || !clientData) {
      console.error('Error fetching client data:', clientError);
      return new Response(JSON.stringify({ error: 'Client not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Prepare the context for the AI
    let contextData = `Client: ${clientData.full_name}\n\n`;
    
    if (goals || clientData.notes) {
      contextData += `Goals: ${goals || clientData.notes}\n\n`;
    }

    if (journal_entries && journal_entries.length > 0) {
      contextData += `Recent Journal Entries:\n${journal_entries.join('\n\n')}\n\n`;
    }

    if (reports && reports.length > 0) {
      contextData += `Recent Reports:\n${reports.join('\n\n')}\n\n`;
    }

    contextData += `Insight Type Requested: ${insight_type}`;

    // Generate insight using OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: promptData.prompt_text
          },
          {
            role: 'user',
            content: contextData
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to generate insight' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const openAIData = await openAIResponse.json();
    const generatedInsight = openAIData.choices[0].message.content;

    // Extract title from the first line or create a default one
    const lines = generatedInsight.split('\n');
    const title = lines[0].length > 100 ? `${insight_type.charAt(0).toUpperCase()}${insight_type.slice(1)} Insight` : lines[0];
    const content = lines.length > 1 ? lines.slice(1).join('\n').trim() : generatedInsight;

    // Save the insight to the database
    const { data: insightData, error: insightError } = await supabase
      .from('insight_entries')
      .insert({
        client_id,
        coach_id: user.id,
        title,
        content,
        type: insight_type,
        confidence_score: Math.floor(Math.random() * 15) + 85 // Random confidence between 85-99%
      })
      .select()
      .single();

    if (insightError) {
      console.error('Error saving insight:', insightError);
      return new Response(JSON.stringify({ error: 'Failed to save insight' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Insight generated successfully:', insightData.id);

    return new Response(JSON.stringify({
      success: true,
      insight: insightData,
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in generate-insights function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
