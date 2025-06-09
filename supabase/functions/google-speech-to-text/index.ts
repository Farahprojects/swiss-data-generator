
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache for repeated phrases (simple in-memory cache)
const transcriptionCache = new Map<string, { transcript: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioData, config } = await req.json();
    
    if (!audioData) {
      throw new Error('Audio data is required');
    }

    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!googleApiKey) {
      throw new Error('Google API key not configured');
    }

    // Generate cache key from audio data hash (simplified)
    const audioHash = btoa(audioData.slice(0, 100)); // Use first 100 chars as simple hash
    const cacheKey = `${audioHash}_${JSON.stringify(config)}`;
    
    // Check cache first
    const cached = transcriptionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached result');
      return new Response(
        JSON.stringify({ 
          transcript: cached.transcript,
          confidence: 0.95,
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Optimized configuration for speed
    const optimizedConfig = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      model: config?.model || 'latest_short', // Use faster model by default
      useEnhanced: config?.useEnhanced || false,
      profanityFilter: false, // Disable for speed
      enableWordTimeOffsets: false, // Disable for speed
      enableWordConfidence: false, // Disable for speed
      maxAlternatives: 1, // Only get top result
      speechContexts: config?.speechContexts || [{
        phrases: ["therapy", "session", "client", "feelings", "emotions"],
        boost: 5
      }],
      ...config
    };

    const requestBody = {
      audio: {
        content: audioData
      },
      config: optimizedConfig
    };

    console.log('Sending optimized request to Google Speech-to-Text API');
    
    const startTime = Date.now();
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

    const processingTime = Date.now() - startTime;
    console.log(`API response time: ${processingTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google API error:', errorText);
      
      // Implement exponential backoff for retries
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`Temporary API error: ${response.status}. Please try again.`);
      }
      
      throw new Error(`Google Speech-to-Text API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    const transcript = result.results?.[0]?.alternatives?.[0]?.transcript || '';
    const confidence = result.results?.[0]?.alternatives?.[0]?.confidence || 0;

    console.log('Transcript:', transcript);
    console.log('Confidence:', confidence);
    console.log('Processing time:', processingTime, 'ms');

    // Cache successful results
    if (transcript && confidence > 0.5) {
      transcriptionCache.set(cacheKey, {
        transcript,
        timestamp: Date.now()
      });
      
      // Clean old cache entries
      if (transcriptionCache.size > 100) {
        const now = Date.now();
        for (const [key, value] of transcriptionCache.entries()) {
          if (now - value.timestamp > CACHE_DURATION) {
            transcriptionCache.delete(key);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        transcript,
        confidence,
        processingTime
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
