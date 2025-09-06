//
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
    
    console.log('[openai-whisper] 📥 RECEIVED:', {
      audioSize: audioBuffer.length,
      mode: meta.mode,
      chat_id: meta.chat_id,
      config: config
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
    const mimeType = config.mimeType || 'audio/webm';
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
    formData.append('language', config.languageCode || 'en');
    formData.append('response_format', 'json');

    // Call OpenAI Whisper API
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
      mode: meta.mode
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

    // For conversation mode: Fire and forget to LLM, then broadcast thinking-mode
    if (meta.mode === 'conversation' && meta.chat_id) {
      console.log('[openai-whisper] 🔄 CONVERSATION MODE: Calling LLM and broadcasting thinking-mode');
      
      // Fire and forget to LLM
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/llm-chat`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: meta.chat_id,
            text: transcript,
            client_msg_id: crypto.randomUUID(),
            mode: 'conversation'
          })
        });
        console.log('[openai-whisper] ✅ LLM call sent (fire and forget)');
      } catch (error) {
        console.error('[openai-whisper] ❌ LLM call failed:', error);
      }

      // Broadcast thinking-mode to WebSocket
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/broadcast`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: `conversation:${meta.chat_id}`,
            event: 'thinking-mode',
            payload: { transcript }
          })
        });
        console.log('[openai-whisper] ✅ thinking-mode broadcast sent');
      } catch (error) {
        console.error('[openai-whisper] ❌ thinking-mode broadcast failed:', error);
      }
    }

    // Return simple transcript result
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
