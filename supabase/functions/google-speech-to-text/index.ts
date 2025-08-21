
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { audioData, config, traceId, chat_id, meta } = await req.json();
    
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
    
    console.log(`[google-stt]`, traceId ? `[trace:${traceId}]` : '', `Audio data received.`, {
      base64Length: audioData.length,
      clientMeta: meta,
    });
    
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
          // Deno doesn't have Buffer, so we convert base64 to Uint8Array
          const binaryString = atob(audioData);
          const binaryData = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            binaryData[i] = binaryString.charCodeAt(i);
          }
          const audioBlob = new Blob([binaryData], { type: 'audio/webm' });

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

    // Save user message to database if chat_id provided
    if (chat_id && transcript && transcript.trim().length > 0) {
      console.log(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Saving user message to DB`);
      try {
        const { data: savedMessage, error: saveError } = await supabaseAdmin
          .from('messages')
          .insert({
            chat_id: chat_id,
            role: 'user',
            text: transcript,
            meta: { ...(meta || {}), stt_provider }
          })
          .select()
          .single();

        if (saveError) {
          console.error(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Error saving user message:`, saveError);
        } else {
          const savedMessageId = savedMessage.id;
          console.log(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} User message saved with ID:`, savedMessageId);
        }
      } catch (dbError) {
        console.error(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Database error:`, dbError);
      }
    }

    // After saving, trigger the llm-handler to get an immediate AI response
    let assistantMessage = null;
    if (chat_id && transcript && transcript.trim().length > 0) {
      console.log(`[google-stt] ${traceId ? `[trace:${traceId}]` : ''} Triggering llm-handler`);
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
    }

    return new Response(
      JSON.stringify({ 
        transcript,
        confidence,
        assistantMessage // Include the full assistant message in the response
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
