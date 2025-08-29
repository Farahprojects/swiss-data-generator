// OpenAI Realtime TTS WebSocket streaming service - Phase 2 PCM
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // Handle HTTP POST requests (legacy - now handled via WebSocket)
  if (req.method === "POST") {
    return new Response(JSON.stringify({ 
      error: "HTTP POST not supported. Use WebSocket connection for TTS streaming." 
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Handle WebSocket connections from frontend
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  try {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    // Get auth and session details from URL params
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    const authorization = headers.get('authorization');
    
    if (!sessionId) {
      socket.close(1008, "Missing sessionId parameter");
      return response;
    }

    console.log(`[TTS-WS] WebSocket connection established for session: ${sessionId}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authorization! } } }
    );

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle ping/pong for health monitoring
        if (data.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
          return;
        }
        
        const { text, voice = "alloy", chat_id } = data;
        
        if (!text || !chat_id) {
          socket.send(JSON.stringify({ error: "Missing required fields: text, chat_id" }));
          return;
        }

        console.log(`[TTS-WS] WebSocket TTS request for session ${sessionId}, text length: ${text.length}`);
        
        // Connect to OpenAI Realtime API
        const openaiWs = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview");
        
        openaiWs.onopen = () => {
          console.log(`[TTS-WS] OpenAI Realtime connection opened for session ${sessionId}`);
          
          // Set audio output format to PCM16
          openaiWs.send(JSON.stringify({
            type: "session.update",
            session: {
              voice: voice,
              audio_format: {
                type: "pcm16",
                sample_rate: 24000
              }
            }
          }));
          
          // Create response with text and audio
          openaiWs.send(JSON.stringify({
            type: "response.create",
            response: {
              modalities: ["text", "audio"],
              instructions: text,
              audio: {
                voice: voice
              }
            }
          }));
        };
        
        openaiWs.onmessage = (openaiEvent) => {
          try {
            const openaiData = JSON.parse(openaiEvent.data);
            
            if (openaiData.type === "response.output_audio.delta") {
              // Decode base64 PCM to binary and forward to browser
              const pcmData = atob(openaiData.delta);
              const pcmArray = new Uint8Array(pcmData.length);
              for (let i = 0; i < pcmData.length; i++) {
                pcmArray[i] = pcmData.charCodeAt(i);
              }
              
              // Send as Int16Array (PCM16)
              const int16Array = new Int16Array(pcmArray.buffer);
              socket.send(int16Array.buffer);
              
            } else if (openaiData.type === "response.output_audio.done" || openaiData.type === "response.completed") {
              // Send stream end signal
              socket.send(JSON.stringify({ type: "stream-end" }));
              openaiWs.close();
              
            } else if (openaiData.type === "response.output_text.delta") {
              // Text output (optional - we're focusing on audio)
              console.log(`[TTS-WS] Text delta: ${openaiData.delta}`);
            }
            
          } catch (parseError) {
            console.error(`[TTS-WS] Error parsing OpenAI message:`, parseError);
          }
        };
        
        openaiWs.onerror = (error) => {
          console.error(`[TTS-WS] OpenAI Realtime error for session ${sessionId}:`, error);
          socket.send(JSON.stringify({ error: "OpenAI Realtime connection failed" }));
        };
        
        openaiWs.onclose = () => {
          console.log(`[TTS-WS] OpenAI Realtime connection closed for session ${sessionId}`);
        };
        
        // Send stream start signal
        socket.send(JSON.stringify({ type: "stream-start" }));

      } catch (error) {
        console.error(`[TTS-WS] Error processing message for session ${sessionId}:`, error);
        socket.send(JSON.stringify({ error: error.message }));
      }
    };

    socket.onclose = (event) => {
      console.log(`[TTS-WS] WebSocket connection closed for session ${sessionId}, code: ${event.code}, reason: ${event.reason}`);
    };

    socket.onerror = (error) => {
      console.error(`[TTS-WS] WebSocket error for session ${sessionId}:`, error);
    };

    return response;

  } catch (error) {
    console.error("[TTS-WS] Failed to upgrade to WebSocket:", error);
    return new Response("WebSocket upgrade failed", { status: 500 });
  }
});