
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-meta, x-trace-id',
};

Deno.serve(async (req) => {
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
    const audioBlob = new Blob([audioBuffer], { 
      type: config.mimeType || 'audio/webm' 
    });
    
    // Add file to FormData
    formData.append('file', audioBlob, 'audio.webm');
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
