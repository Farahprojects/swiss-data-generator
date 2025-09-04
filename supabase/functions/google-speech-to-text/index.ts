
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-meta, x-trace-id',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get raw binary audio data
    const arrayBuffer = await req.arrayBuffer();
    const audioBuffer = new Uint8Array(arrayBuffer);
    
    // Get basic config from headers if provided
    const metaHeader = req.headers.get('X-Meta');
    const meta = metaHeader ? JSON.parse(metaHeader) : {};
    const config = meta.config || {};
    
    // Validate audio data
    if (!audioBuffer || audioBuffer.length === 0) {
      console.error('[google-stt] Empty audio buffer');
      throw new Error('Empty audio data - please try recording again');
    }

    const googleApiKey = Deno.env.get('GOOGLE-STT');
    if (!googleApiKey) {
      throw new Error('Google STT API key not configured');
    }

    // Simple configuration with essential settings only
    const sttConfig = {
      encoding: 'WEBM_OPUS',
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      model: 'latest_long',
      ...config
    };

    // Convert raw binary to base64 for Google API (required format)
    // CRITICAL: Handle large audio buffers without stack overflow
    let binaryString = '';
    const chunkSize = 8192; // Process in chunks to avoid stack overflow
    for (let i = 0; i < audioBuffer.length; i += chunkSize) {
      const chunk = audioBuffer.slice(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }
    const base64Audio = btoa(binaryString);
    
    const requestBody = {
      audio: {
        content: base64Audio
      },
      config: sttConfig
    };


    
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

    let transcript;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[google-stt] Google API error:', errorText);

      // Whisper Fallback Logic for long audio
      if (response.status === 400 && errorText.includes("Sync input too long")) {
        console.warn('[google-stt] Audio too long for Google, falling back to Whisper');

        const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openAiApiKey) {
          throw new Error('OpenAI API key not configured for fallback');
        }

        try {
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
            console.error('[google-stt] Whisper fallback failed:', whisperErrorText);
            throw new Error(`Whisper fallback failed: ${whisperResponse.status} - ${whisperErrorText}`);
          }

          const whisperResult = await whisperResponse.json();
          transcript = whisperResult.text || '';
          console.log('[google-stt] Whisper fallback successful');

        } catch (fallbackError) {
          console.error('[google-stt] Whisper fallback error:', fallbackError);
          throw new Error(`Google Speech-to-Text API error: ${response.status} - ${errorText}`);
        }

      } else {
        throw new Error(`Google Speech-to-Text API error: ${response.status} - ${errorText}`);
      }
    } else {
      const result = await response.json();
      transcript = result.results?.[0]?.alternatives?.[0]?.transcript || '';
    }


    // Handle empty transcription results
    if (!transcript || transcript.trim().length === 0) {
      return new Response(
        JSON.stringify({ transcript: '' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Return simple transcript result
    return new Response(
      JSON.stringify({ transcript }),
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
