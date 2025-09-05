
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
      sessionId: meta.sessionId,
      config: config,
      audioHeader: Array.from(audioBuffer.slice(0, 8)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')
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

    // Detect audio format and configure accordingly
    let encoding = 'WEBM_OPUS';
    let sampleRateHertz = 48000;
    
    // Try to detect format from audio data or use defaults
    if (audioBuffer.length > 0) {
      // Check for common audio format headers
      const header = Array.from(audioBuffer.slice(0, 12));
      
      // WebM/Opus detection
      if (header[0] === 0x1A && header[1] === 0x45 && header[2] === 0xDF && header[3] === 0xA3) {
        encoding = 'WEBM_OPUS';
        sampleRateHertz = 48000;
        console.log('[google-stt] 🎯 Detected WebM/Opus format');
      }
      // MP4 detection
      else if (header[4] === 0x66 && header[5] === 0x74 && header[6] === 0x79 && header[7] === 0x70) {
        encoding = 'MP4';
        sampleRateHertz = 48000;
        console.log('[google-stt] 🎯 Detected MP4 format');
      }
      // Default to WebM/Opus for mobile optimization
      else {
        console.log('[google-stt] 🎯 Using default WebM/Opus format');
      }
    }

    // Optimal configuration for detected format
    const sttConfig = {
      encoding: encoding,
      sampleRateHertz: sampleRateHertz,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      model: 'latest_short',         // Mobile-first: Faster model
      ...config
    };

    // Mobile-first: Optimized base64 conversion for smaller files
    let binaryString = '';
    const chunkSize = 16384; // Mobile-first: Larger chunks for faster processing
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
      console.error('[google-stt] Google API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        config: sttConfig,
        audioSize: audioBuffer.length
      });
      throw new Error(`Google Speech-to-Text API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    transcript = result.results?.[0]?.alternatives?.[0]?.transcript || '';

    console.log('[google-stt] 📤 SENDING:', {
      transcriptLength: transcript.length,
      transcript: transcript.substring(0, 100) + (transcript.length > 100 ? '...' : ''),
      mode: meta.mode
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
