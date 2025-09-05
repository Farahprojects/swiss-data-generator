
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
    
    console.log('[google-stt] 📥 RECEIVED:', {
      audioSize: audioBuffer.length,
      mode: meta.mode,
      chat_id: meta.chat_id,
      config: config,
      firstBytes: Array.from(audioBuffer.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '),
      lastBytes: Array.from(audioBuffer.slice(-16)).map(b => b.toString(16).padStart(2, '0')).join(' ')
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

    // Google STT V2: Simplified configuration - let Google auto-detect format
    const sttConfig = {
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      model: 'latest_short',         // Mobile-first: Faster model
      ...config
    };

    // Google STT V2: Send raw binary data directly - no base64 conversion needed
    const requestBody = {
      audio: {
        content: Array.from(audioBuffer)  // Send raw bytes directly
      },
      config: sttConfig
    };

    // Google STT V2 API endpoint
    let response = await fetch(
      `https://speech.googleapis.com/v2/speech:recognize?key=${googleApiKey}`,
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
      throw new Error(`Google Speech-to-Text API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    transcript = result.results?.[0]?.alternatives?.[0]?.transcript || '';

    console.log('[google-stt] 📤 GOOGLE API RESPONSE:', {
      fullResponse: result,
      transcriptLength: transcript.length,
      transcript: transcript.substring(0, 100) + (transcript.length > 100 ? '...' : ''),
      mode: meta.mode,
      hasResults: !!result.results,
      resultsLength: result.results?.length || 0
    });

    // Handle empty transcription results
    if (!transcript || transcript.trim().length === 0) {
      console.log('[google-stt] ⚠️ Empty transcript - returning empty result');
      return new Response(
        JSON.stringify({ transcript: '' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Return simple transcript result
    console.log('[google-stt] ✅ FIRE-AND-FORGET: Transcript sent, function complete');
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
