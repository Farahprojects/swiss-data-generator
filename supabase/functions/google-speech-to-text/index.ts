
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trace-id, x-meta',
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get raw binary audio data
    const arrayBuffer = await req.arrayBuffer();
    const audioBuffer = new Uint8Array(arrayBuffer);
    
    // Get metadata from headers
    const traceId = req.headers.get('X-Trace-Id') || null;
    const metaHeader = req.headers.get('X-Meta');
    const meta = metaHeader ? JSON.parse(metaHeader) : {};
    const config = meta.config || {};
    
    console.log(`[google-stt]`, traceId ? `[trace:${traceId}]` : '', `Raw audio data received.`, {
      audioSize: audioBuffer.length,
      clientMeta: meta,
    });
    
    // Validate audio data
    if (!audioBuffer || audioBuffer.length === 0) {
      console.error('[google-stt] Empty audio buffer');
      throw new Error('Empty audio data - please try recording again');
    }

    const googleApiKey = Deno.env.get('GOOGLE-STT');
    if (!googleApiKey) {
      throw new Error('Google STT API key not configured');
    }

    // Simplified configuration using only supported fields
    const defaultConfig = {
      encoding: 'WEBM_OPUS',
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

    // Convert raw binary to base64 for Google API (required format)
    const base64Audio = btoa(String.fromCharCode(...audioBuffer));
    
    const requestBody = {
      audio: {
        content: base64Audio
      },
      config: defaultConfig
    };

    console.log('[google-stt]', traceId ? `[trace:${traceId}]` : '', 'Sending request to Google Speech-to-Text API');
    console.log('[google-stt]', traceId ? `[trace:${traceId}]` : '', 'Config:', JSON.stringify(defaultConfig, null, 2));
    
    let response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    let result;
    let transcript;
    let confidence = 0;
    let stt_provider = 'google';

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[google-stt]', traceId ? `[trace:${traceId}]` : '', 'Google API error:', errorText);

      // Whisper Fallback Logic
      if (response.status === 400 && errorText.includes("Sync input too long")) {
        console.warn(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Google rejected for duration, falling back to Whisper`);
        stt_provider = 'openai_whisper_fallback';

        const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openAiApiKey) {
          throw new Error('OpenAI API key not configured for fallback');
        }

        try {
          // Use the raw audio buffer directly for Whisper
          const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });

          const formData = new FormData();
          formData.append('file', audioBlob, 'audio.webm');
          formData.append('model', 'whisper-1');

          const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAiApiKey}`,
            },
            body: formData,
          });

          if (!whisperResponse.ok) {
            const whisperErrorText = await whisperResponse.text();
            console.error(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Whisper fallback failed:`, whisperErrorText);
            throw new Error(`Whisper fallback failed: ${whisperResponse.status} - ${whisperErrorText}`);
          }

          const whisperResult = await whisperResponse.json();
          transcript = whisperResult.text || '';
          confidence = 1; // Whisper doesn't provide confidence, assume 1

          console.log(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Whisper fallback successful. Transcript length: ${transcript.length}`);

        } catch (fallbackError) {
          console.error(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Error during Whisper fallback execution:`, fallbackError);
          // Re-throw original Google error if fallback fails critically
          throw new Error(`Google Speech-to-Text API error: ${response.status} - ${errorText}`);
        }

      } else {
        // Not a duration error, so throw it
        throw new Error(`Google Speech-to-Text API error: ${response.status} - ${errorText}`);
      }
    } else {
      result = await response.json();
      console.log('[google-stt]', traceId ? `[trace:${traceId}]` : '', 'Google API response:', result);
      transcript = result.results?.[0]?.alternatives?.[0]?.transcript || '';
      confidence = result.results?.[0]?.alternatives?.[0]?.confidence || 0;
    }

    console.log('[google-stt]', traceId ? `[trace:${traceId}]` : '', 'Extracted transcript length:', transcript?.length || 0);
    console.log('[google-stt]', traceId ? `[trace:${traceId}]` : '', 'Confidence score:', confidence);
    
    // Handle empty transcription results - return empty transcript instead of error
    if (!transcript || transcript.trim().length === 0) {
      console.warn('[google-stt]', traceId ? `[trace:${traceId}]` : '', 'Empty transcript from API - audio may be unclear or silent');
      console.log('[google-stt]', traceId ? `[trace:${traceId}]` : '', 'Returning empty transcript for conversation mode to continue gracefully');
      return new Response(
        JSON.stringify({ 
          transcript: '', // Empty transcript
          confidence: 0,
          note: 'No speech detected - conversation can continue'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (confidence < 0.3) {
      console.warn('[google-stt] Low confidence transcript:', confidence, 'for:', transcript);
      // Still return it but log the warning
    }

    // This function's only job is to return the transcript.
    // The client (ChatController) will orchestrate the next steps.
    return new Response(
      JSON.stringify({ 
        transcript,
        confidence,
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
