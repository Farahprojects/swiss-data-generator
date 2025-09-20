// @ts-nocheck
//
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Handle warmup request
    const warmupHeader = req.headers.get('X-Warmup');
    if (warmupHeader === '1') {
      console.log('[openai-whisper] 🔥 Warmup request received');
      return new Response(JSON.stringify({ status: 'warmed up' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fire-and-forget: Expect multipart/form-data with: file, chat_id, mode, language
    let file: File | null = null;
    let chat_id: string | undefined = undefined;
    let mode: string | undefined = undefined;
    let language = 'en';
    let audioBuffer = new Uint8Array();
    let mimeType = 'audio/webm';
    
    req.formData()
      .then((form) => {
        file = form.get('file') as File | null;
        chat_id = (form.get('chat_id') as string) || undefined;
        mode = (form.get('mode') as string) || undefined;
        language = (form.get('language') as string) || 'en';
        
        if (!file) {
          throw new Error('Missing file in form-data');
        }

        return file.arrayBuffer();
      })
      .then((arrayBuffer) => {
        audioBuffer = new Uint8Array(arrayBuffer);
        mimeType = file?.type || 'audio/webm';
        return audioBuffer;
      })
      .catch((err) => {
        console.error('[openai-whisper] Form data processing error:', err);
      });

    console.log('[openai-whisper] 📥 RECEIVED:', {
      audioSize: audioBuffer.length,
      mode,
      chat_id,
      mimeType
    });
    
    // Validate audio data
    if (!audioBuffer || audioBuffer.length === 0) {
      console.error('[openai-whisper] Empty audio buffer');
      throw new Error('Empty audio data - please try recording again');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create FormData for OpenAI Whisper API
    const formData = new FormData();
    
    // Create a Blob from the audio buffer with appropriate MIME type
    const audioBlob = new Blob([audioBuffer], { type: mimeType });
    
    // Determine appropriate file extension based on MIME type
    let filename = 'audio.webm';
    if (mimeType.includes('mp4')) {
      filename = 'audio.mp4';
    } else if (mimeType.includes('ogg')) {
      filename = 'audio.ogg';
    } else if (mimeType.includes('wav')) {
      filename = 'audio.wav';
    }
    
    // Log detailed audio info for debugging
    console.log('[openai-whisper] 🔍 AUDIO DETAILS:', {
      mimeType,
      filename,
      audioSize: audioBuffer.length,
      firstBytes: Array.from(audioBuffer.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')
    });
    
    // Add file to FormData with correct filename
    formData.append('file', audioBlob, filename);
    formData.append('model', 'whisper-1');
    formData.append('language', language || 'en');
    formData.append('response_format', 'json');

    // Fire-and-forget: Call OpenAI Whisper API
    let transcript = '';
    
    fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: formData,
      }
    )
    .then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[openai-whisper] OpenAI API error:', errorText);
        throw new Error(`OpenAI Whisper API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      transcript = result.text || '';
      return transcript;
    })
    .catch((error) => {
      console.error('[openai-whisper] Whisper API error:', error);
      transcript = '';
    });

    // Return immediately - processing happens in background
    console.log('[openai-whisper] 📤 RETURNING: Audio processing started in background');
    return new Response(
      JSON.stringify({ transcript: '' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );


  } catch (error) {
    console.error('Error in openai-whisper function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
