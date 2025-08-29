// OpenAI Realtime TTS WebSocket streaming service - Phase 2 PCM
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Session management: sessionId → WebSocket connection
const activeSessions = new Map<string, WebSocket>();

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

    // Register this session
    activeSessions.set(sessionId, socket);
    console.log(`[TTS-WS] Registered session ${sessionId}, total active sessions: ${activeSessions.size}`);

    // Clean up session on disconnect
    socket.onclose = () => {
      activeSessions.delete(sessionId);
      console.log(`[TTS-WS] Session ${sessionId} disconnected, remaining sessions: ${activeSessions.size}`);
    };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authorization! } } }
    );

    socket.onmessage = async (event) => {
      try {
        console.log(`[TTS-WS] Received message from session ${sessionId}:`, event.data);
        
        const data = JSON.parse(event.data);
        console.log(`[TTS-WS] Parsed message for session ${sessionId}:`, data);
        
        // Handle ping/pong for health monitoring
        if (data.type === 'ping') {
          console.log(`[TTS-WS] Ping received from session ${sessionId}`);
          socket.send(JSON.stringify({ type: 'pong' }));
          return;
        }
        
        // Handle session registration
        if (data.type === 'register') {
          console.log(`[TTS-WS] Session ${sessionId} registered successfully`);
          socket.send(JSON.stringify({ type: 'registered', sessionId }));
          return;
        }
        
        // Handle TTS requests
        if (data.type === 'tts') {
          const { text, voice = "alloy", chat_id } = data;
          
          if (!text || !chat_id) {
            console.error(`[TTS-WS] Missing required fields for session ${sessionId}: text=${!!text}, chat_id=${!!chat_id}`);
            socket.send(JSON.stringify({ error: "Missing required fields: text, chat_id" }));
            return;
          }

          console.log(`[TTS-WS] TTS request for session ${sessionId}, text: "${text.substring(0, 50)}...", voice: ${voice}, chat_id: ${chat_id}`);
          
          // Process TTS request
          await processTtsRequest(sessionId, text, voice, chat_id);
          return;
        }
        
        // Legacy support for direct TTS requests (deprecated)
        console.log(`[TTS-WS] Legacy TTS request format detected for session ${sessionId}, converting to new format`);
        const { text, voice = "alloy", chat_id } = data;
        
        if (!text || !chat_id) {
          socket.send(JSON.stringify({ error: "Missing required fields: text, chat_id" }));
          return;
        }

        // Use the new TTS processing function
        await processTtsRequest(sessionId, text, voice, chat_id);

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

// ✅ NEW: Extract TTS processing into reusable function
async function processTtsRequest(sessionId: string, text: string, voice: string, chat_id: string): Promise<void> {
  const socket = activeSessions.get(sessionId);
  if (!socket) {
    console.error(`[TTS-WS] Session ${sessionId} not found for TTS request`);
    return;
  }

  console.log(`[TTS-WS] Processing TTS request for session ${sessionId}, text length: ${text.length}`);
  
  // Send stream start signal immediately
  socket.send(JSON.stringify({ type: "stream-start" }));
  console.log(`[TTS-WS] Stream start signal sent to session ${sessionId}`);
  
  try {
    console.log(`[TTS-WS] Calling OpenAI API for session ${sessionId}...`);
    
    const requestBody = {
      model: "gpt-4o-mini-tts",
      modalities: ["text", "audio"],
      input: text,
      audio: {
        voice: voice,
        format: "pcm16",
        sample_rate: 24000
      },
      stream: true
    };
    
    console.log(`[TTS-WS] OpenAI request body for session ${sessionId}:`, JSON.stringify(requestBody, null, 2));
    
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "responses=v1"
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`[TTS-WS] OpenAI response status: ${openaiResponse.status} for session ${sessionId}`);
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error(`[TTS-WS] OpenAI API error: ${openaiResponse.status} - ${errorText}`);
      socket.send(JSON.stringify({ error: `OpenAI API failed: ${openaiResponse.status}` }));
      return;
    }
    
    if (!openaiResponse.body) {
      console.error(`[TTS-WS] No response body from OpenAI API for session ${sessionId}`);
      socket.send(JSON.stringify({ error: "No response body from OpenAI API" }));
      return;
    }
    
    console.log(`[TTS-WS] ✅ OpenAI SSE connection established for session ${sessionId}`);
    
    // Read the SSE stream
    const reader = openaiResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let deltaCount = 0;
    let totalBytes = 0;
    
    // No-delta timeout mechanism
    const noDeltaTimeout = setTimeout(() => {
      if (deltaCount === 0) {
        console.error(`[TTS-WS] No audio deltas received within 2 seconds for session ${sessionId}`);
        socket.send(JSON.stringify({ error: "No audio deltas received" }));
        return;
      }
    }, 2000);
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
                      for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = line.slice(6); // Remove 'data: ' prefix
                    if (data === '[DONE]') {
                      console.log(`[TTS-WS] OpenAI stream completed for session ${sessionId}`);
                      socket.send(JSON.stringify({ type: "stream-end" }));
                      return;
                    }
                    
                    const event = JSON.parse(data);
                    console.log(`[TTS-WS] SSE event for session ${sessionId}:`, event.type);
              
              if (event.type === "response.audio.delta" || event.type === "response.output_audio.delta") {
                // Decode base64 PCM to binary and forward to browser
                const pcmData = atob(event.delta);
                const pcmArray = new Uint8Array(pcmData.length);
                for (let i = 0; i < pcmData.length; i++) {
                  pcmArray[i] = pcmData.charCodeAt(i);
                }
                
                                       // Send as Int16Array (PCM16)
                       const int16Array = new Int16Array(pcmArray.buffer);
                       console.log(`[TTS-WS] Sending PCM chunk ${deltaCount + 1} to session ${sessionId}: ${int16Array.length} samples, ${int16Array.byteLength} bytes`);
                       socket.send(int16Array.buffer);
                       
                       deltaCount++;
                       totalBytes += int16Array.byteLength;
                
                // Log progress every 10 chunks
                if (deltaCount % 10 === 0) {
                  console.log(`[TTS-WS] Forwarded ${deltaCount} PCM chunks (${totalBytes} bytes) for session ${sessionId}`);
                }
                
                // Clear the no-delta timeout on first chunk
                if (deltaCount === 1) {
                  clearTimeout(noDeltaTimeout);
                }
                
              } else if (event.type === "response.completed") {
                clearTimeout(noDeltaTimeout);
                console.log(`[TTS-WS] OpenAI response completed for session ${sessionId}, total: ${deltaCount} chunks, ${totalBytes} bytes`);
                socket.send(JSON.stringify({ type: "stream-end" }));
                return;
                
              } else if (event.type === "response.text.delta") {
                // Text output (optional - we're focusing on audio)
                console.log(`[TTS-WS] Text delta: ${event.delta}`);
              }
              
            } catch (parseError) {
              console.error(`[TTS-WS] Error parsing SSE event:`, parseError);
            }
          }
        }
      }
      
    } catch (streamError) {
      console.error(`[TTS-WS] SSE streaming error for session ${sessionId}:`, streamError);
      socket.send(JSON.stringify({ error: "SSE streaming failed" }));
    } finally {
      clearTimeout(noDeltaTimeout);
      reader.releaseLock();
    }
    
  } catch (fetchError) {
    console.error(`[TTS-WS] Failed to connect to OpenAI API for session ${sessionId}:`, fetchError);
    socket.send(JSON.stringify({ error: "Failed to connect to OpenAI API" }));
  }
}

// ✅ NEW: Function to send TTS to any session (for backend-initiated TTS)
export async function sendTtsToSession(sessionId: string, text: string, voice: string = "alloy", chat_id?: string): Promise<boolean> {
  if (!activeSessions.has(sessionId)) {
    console.error(`[TTS-WS] Cannot send TTS to session ${sessionId} - session not found`);
    return false;
  }
  
  console.log(`[TTS-WS] Backend-initiated TTS for session ${sessionId}, text length: ${text.length}`);
  await processTtsRequest(sessionId, text, voice, chat_id || "backend");
  return true;
}