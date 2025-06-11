import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Keep connections warm
let lastWarmupTime = 0;
const WARMUP_INTERVAL = 240000; // 4 minutes

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, audioData, chunkIndex, isLast, config } = await req.json();
    
    // Handle warmup requests
    if (action === 'warmup') {
      lastWarmupTime = Date.now();
      return new Response(
        JSON.stringify({ status: 'warm', timestamp: lastWarmupTime }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle chunk processing
    if (action === 'process_chunk' && audioData) {
      const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
      if (!googleApiKey) {
        throw new Error('Google API key not configured');
      }

      // Optimized configuration for streaming/real-time processing
      const streamingConfig = {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        model: 'latest_short', // Faster model for real-time
        useEnhanced: true,
        enableWordTimeOffsets: false, // Disable to reduce response size
        enableWordConfidence: false, // Disable to reduce response size
        speechContexts: [{
          phrases: ["therapy", "session", "client", "feelings", "emotions", "breakthrough", "progress"],
          boost: 15
        }],
        ...config
      };

      const requestBody = {
        audio: {
          content: audioData
        },
        config: streamingConfig
      };

      console.log(`Processing chunk ${chunkIndex}, isLast: ${isLast}`);
      
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
        console.error('Google API error:', errorText);
        throw new Error(`Google Speech-to-Text API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`Chunk ${chunkIndex} processed:`, result);

      // Extract transcript with improved confidence handling
      let transcript = '';
      let confidence = 0;
      
      if (result.results && result.results.length > 0) {
        // Get the best alternative from the first result
        const bestResult = result.results[0];
        if (bestResult.alternatives && bestResult.alternatives.length > 0) {
          transcript = bestResult.alternatives[0].transcript || '';
          confidence = bestResult.alternatives[0].confidence || 0;
        }
      }

      // Return structured result for streaming
      return new Response(
        JSON.stringify({ 
          text: transcript,
          confidence: confidence,
          chunkIndex: chunkIndex,
          isFinal: isLast,
          processed: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action or missing data' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in streaming-speech-to-text function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
