
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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
    
    // Comprehensive audio data validation
    if (!audioData) {
      console.error('[google-stt] Missing audioData in request');
      throw new Error('Audio data is required');
    }
    
    if (typeof audioData !== 'string') {
      console.error('[google-stt] AudioData is not a string:', typeof audioData);
      throw new Error('Audio data must be base64 encoded string');
    }
    
    if (audioData.length === 0) {
      console.error('[google-stt] Empty audioData string');
      throw new Error('Empty audio data - please try recording again');
    }
    
    // Check if base64 data is too small (likely empty recording)
    const estimatedBytes = (audioData.length * 3) / 4; // Base64 to bytes approximation
    if (estimatedBytes < 1000) {
      console.error('[google-stt] Audio data too small:', estimatedBytes, 'bytes estimated');
      throw new Error('Audio recording too short - please speak for longer');
    }
    
    console.log(`[google-stt] Audio data validated - estimated size: ${estimatedBytes} bytes`);
    
    // Test base64 decode to catch invalid format early
    try {
      atob(audioData.substring(0, 100)); // Test decode first 100 chars
    } catch (decodeError) {
      console.error('[google-stt] Invalid base64 format:', decodeError);
      throw new Error('Invalid audio data format - please try recording again');
    }

    const googleApiKey = Deno.env.get('GOOGLE-STT');
    if (!googleApiKey) {
      throw new Error('Google STT API key not configured');
    }

    // Simplified configuration using only supported fields
    const defaultConfig = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      model: 'latest_long',
      useEnhanced: true,
      speechContexts: [{
        phrases: ["therapy", "session", "client", "feelings", "emotions", "breakthrough", "progress"],
        boost: 10
      }],
      ...config
    };

    const requestBody = {
      audio: {
        content: audioData
      },
      config: defaultConfig
    };

    console.log('Sending request to Google Speech-to-Text API');
    console.log('Config:', JSON.stringify(defaultConfig, null, 2));
    
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
      throw new Error(`Google Speech-to-Text API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Google API response:', result);

    // Extract the transcript from the first result
    const transcript = result.results?.[0]?.alternatives?.[0]?.transcript || '';
    const confidence = result.results?.[0]?.alternatives?.[0]?.confidence || 0;

    console.log('Extracted transcript:', transcript);
    console.log('Confidence score:', confidence);
    
    // Handle empty transcription results
    if (!transcript || transcript.trim().length === 0) {
      console.warn('[google-stt] Empty transcript from Google API - audio may be unclear or silent');
      throw new Error('No speech detected - please speak more clearly or try again');
    }
    
    if (confidence < 0.3) {
      console.warn('[google-stt] Low confidence transcript:', confidence, 'for:', transcript);
      // Still return it but log the warning
    }

    return new Response(
      JSON.stringify({ 
        transcript,
        confidence
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
