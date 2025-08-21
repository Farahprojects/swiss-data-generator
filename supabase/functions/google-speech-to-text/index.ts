
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate request method
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Parse and validate request body
    const { audioData, config, traceId, chat_id, meta } = await req.json();
    
    // Validate audio data
    if (!audioData || typeof audioData !== 'string' || audioData.length === 0) {
      console.error('[google-stt] Invalid audio data:', { 
        hasData: !!audioData, 
        type: typeof audioData, 
        length: audioData?.length 
      });
      throw new Error('Valid audio data is required');
    }
    
    // Test base64 decode to catch invalid format early
    try {
      atob(audioData.substring(0, 100));
    } catch (decodeError) {
      console.error('[google-stt] Invalid base64 format:', decodeError);
      throw new Error('Invalid audio data format - please try recording again');
    }

    // Validate API key
    const googleApiKey = Deno.env.get('GOOGLE-STT');
    if (!googleApiKey) {
      throw new Error('Google STT API key not configured');
    }

    // Log audio data info
    console.log(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Audio data received`, {
      audioDataLength: audioData.length,
      estimatedSizeKB: Math.round(audioData.length * 0.75 / 1024),
      traceId
    });

    // Analyze audio data structure
    try {
      const decodedAudio = atob(audioData);
      console.log(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Audio data analysis:`, {
        decodedLength: decodedAudio.length,
        decodedSizeKB: Math.round(decodedAudio.length / 1024),
        firstBytes: Array.from(decodedAudio.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '),
        hasWebMHeader: decodedAudio.slice(0, 4).toString() === 'EBML',
        hasOpusHeader: decodedAudio.includes('OpusHead'),
        estimatedDurationFromSize: Math.round((decodedAudio.length / 128000) * 8 * 1000), // ms
        usingOGGOpus: true,
      });
    } catch (decodeError) {
      console.error(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Error analyzing audio data:`, decodeError);
    }

    // Build Google STT configuration - Use OGG_OPUS to bypass WebM container issues
    const defaultConfig = {
      encoding: 'OGG_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      model: 'latest_short',
      speechContexts: [{
        phrases: ["therapy", "session", "client", "feelings", "emotions", "breakthrough", "progress"],
        boost: 10
      }],
      ...config
    };

    // Build request payload
    const requestBody = {
      audio: {
        content: audioData
      },
      config: defaultConfig
    };

    // Log the full request payload for debugging
    console.log(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Full Google STT request payload:`, 
      JSON.stringify(requestBody, null, 2)
    );

    // Call Google STT API
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
      console.error('[google-stt]', traceId ? `[trace:${traceId}]` : '', 'Google API error:', errorText);
      throw new Error(`Google Speech-to-Text API error: ${response.status} - ${errorText}`);
    }

    // Parse Google STT response
    const result = await response.json();
    const transcript = result.results?.[0]?.alternatives?.[0]?.transcript || '';
    const confidence = result.results?.[0]?.alternatives?.[0]?.confidence || 0;

    console.log('[google-stt]', traceId ? `[trace:${traceId}]` : '', 'Extracted transcript length:', transcript?.length || 0);
    console.log('[google-stt]', traceId ? `[trace:${traceId}]` : '', 'Confidence score:', confidence);
    
    // Handle empty transcription results
    if (!transcript || transcript.trim().length === 0) {
      console.warn('[google-stt]', traceId ? `[trace:${traceId}]` : '', 'Empty transcript from Google API');
      return new Response(
        JSON.stringify({ 
          transcript: '',
          confidence: 0,
          note: 'No speech detected - conversation can continue'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Log low confidence warnings
    if (confidence < 0.3) {
      console.warn('[google-stt] Low confidence transcript:', confidence, 'for:', transcript);
    }

    // Save user message to database if chat_id provided
    let savedMessageId = null;
    if (chat_id && transcript && transcript.trim().length > 0) {
      console.log(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Saving user message to DB`);
      try {
        const { data: savedMessage, error: saveError } = await supabaseAdmin
          .from('messages')
          .insert({
            chat_id: chat_id,
            role: 'user',
            text: transcript,
            meta: meta || { stt_provider: 'google' }
          })
          .select()
          .single();

        if (saveError) {
          console.error(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Error saving user message:`, saveError);
        } else {
          savedMessageId = savedMessage.id;
          console.log(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} User message saved with ID:`, savedMessageId);
        }
      } catch (dbError) {
        console.error(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Database error:`, dbError);
      }
    }

    // Handle LLM processing for conversation mode
    let assistantMessage = null;
    if (chat_id && transcript && transcript.trim().length > 0 && meta?.conversation_mode) {
      console.log(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Triggering llm-handler for conversation mode`);
      try {
        const llmResponse = await fetch(`${SUPABASE_URL}/functions/v1/llm-handler`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({ chat_id })
        });

        if (!llmResponse.ok) {
          const errorText = await llmResponse.text();
          console.error(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} llm-handler call failed:`, errorText);
        } else {
          assistantMessage = await llmResponse.json();
          console.log(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Received response from llm-handler`);
        }
      } catch (llmError) {
        console.error(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Error calling llm-handler:`, llmError);
      }
    } else if (chat_id && transcript && transcript.trim().length > 0) {
      console.log(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Mic icon mode - returning transcript only`);
    }

    // Return successful response
    return new Response(
      JSON.stringify({ 
        transcript,
        confidence,
        savedMessageId,
        assistantMessage
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
