// OpenAI TTS WebSocket streaming service
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

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

    console.log(`[TTS-WS] Connection established for session: ${sessionId}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authorization! } } }
    );

    socket.onmessage = async (event) => {
      try {
        const { text, voice = "alloy", chat_id } = JSON.parse(event.data);
        
        if (!text || !chat_id) {
          socket.send(JSON.stringify({ error: "Missing required fields: text, chat_id" }));
          return;
        }

        console.log(`[TTS-WS] Starting TTS for session ${sessionId}, text length: ${text.length}`);
        
        // Call OpenAI TTS API with streaming
        const ttsResponse = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "tts-1",
            input: text,
            voice: voice,
            response_format: "mp3",
          }),
        });

        if (!ttsResponse.ok) {
          const errorBody = await ttsResponse.text();
          console.error("[TTS-WS] OpenAI TTS API error:", errorBody);
          socket.send(JSON.stringify({ 
            error: `TTS API failed: ${ttsResponse.status}` 
          }));
          return;
        }

        if (!ttsResponse.body) {
          socket.send(JSON.stringify({ error: "No response body from TTS API" }));
          return;
        }

        console.log(`[TTS-WS] TTS response received, starting stream for session ${sessionId}`);
        
        // Send stream start signal
        socket.send(JSON.stringify({ type: "stream-start" }));
        
        // Stream the binary MP3 data
        const reader = ttsResponse.body.getReader();
        let totalBytes = 0;
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            if (value) {
              totalBytes += value.length;
              // Convert Uint8Array to ArrayBuffer for proper WebSocket binary transmission
              socket.send(value.buffer);
            }
          }
          
          console.log(`[TTS-WS] Stream completed for session ${sessionId}, total bytes: ${totalBytes}`);
          
          // Send end-of-stream signal
          socket.send(JSON.stringify({ type: "stream-end" }));
          
        } catch (streamError) {
          console.error(`[TTS-WS] Streaming error for session ${sessionId}:`, streamError);
          socket.send(JSON.stringify({ error: "Streaming failed" }));
        } finally {
          reader.releaseLock();
        }

      } catch (error) {
        console.error(`[TTS-WS] Error processing message for session ${sessionId}:`, error);
        socket.send(JSON.stringify({ error: error.message }));
      }
    };

    socket.onclose = (event) => {
      console.log(`[TTS-WS] Connection closed for session ${sessionId}, code: ${event.code}, reason: ${event.reason}`);
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