
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { audioData, config } = await req.json();
    
    if (!audioData) {
      throw new Error('Audio data is required');
    }

    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!googleApiKey) {
      throw new Error('Google API key not configured');
    }

    // Default configuration for speech recognition
    const defaultConfig = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      ...config
    };

    const requestBody = {
      audio: {
        content: audioData
      },
      config: defaultConfig
    };

    console.log('Sending request to Google Speech-to-Text API');
    
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google API error:', errorText);
      throw new Error(`Google Speech-to-Text API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Google API response:', result);

    // Extract the transcript from the first result
    const transcript = result.results?.[0]?.alternatives?.[0]?.transcript || '';

    return new Response(
      JSON.stringify({ 
        transcript,
        confidence: result.results?.[0]?.alternatives?.[0]?.confidence || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in google-speech-to-text function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
