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

    // Expect multipart/form-data with: file, chat_id, mode, language
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const chat_id = (form.get('chat_id') as string) || undefined;
    const mode = (form.get('mode') as string) || undefined;
    const language = (form.get('language') as string) || 'en';

    if (!file) {
      throw new Error('Missing file in form-data');
    }

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = new Uint8Array(arrayBuffer);
    const mimeType = file.type || 'audio/webm';

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

    // Call OpenAI Whisper API (wait for result - frontend needs the transcript)
    const response = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[openai-whisper] OpenAI API error:', errorText);
      throw new Error(`OpenAI Whisper API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const transcript = result.text || '';

    console.log('[openai-whisper] 📤 OPENAI API RESPONSE:', {
      transcriptLength: transcript.length,
      transcript: transcript.substring(0, 100) + (transcript.length > 100 ? '...' : ''),
      mode
    });

    // Handle empty transcription results
    if (!transcript || transcript.trim().length === 0) {
      console.log('[openai-whisper] ⚠️ Empty transcript - returning empty result');
      return new Response(
        JSON.stringify({ transcript: '' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fire-and-forget: For conversation mode, save user message and call LLM separately
    if (mode === 'conversation' && chat_id) {
      console.log('[openai-whisper] 🔄 CONVERSATION MODE: Saving user message and calling LLM');
      
      // Fire-and-forget: Save user message to chat-send
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/chat-send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id,
          text: transcript,
          client_msg_id: crypto.randomUUID(),
          mode: 'conversation'
        })
      }).catch((error) => {
        console.error('[openai-whisper] ❌ User message save failed:', error);
      });

      // Fire-and-forget: Call LLM
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/llm-handler-openai`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id,
          text: transcript,
          mode: 'conversation'
        })
      }).catch((error) => {
        console.error('[openai-whisper] ❌ LLM call failed:', error);
      });
    }

    // Return the actual transcript - frontend needs this to trigger thinking mode
    console.log('[openai-whisper] ✅ SUCCESS: Transcript received');
    return new Response(
      JSON.stringify({ transcript }),
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
