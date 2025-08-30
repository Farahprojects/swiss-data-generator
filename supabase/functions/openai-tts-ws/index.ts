// OpenAI Realtime TTS WebSocket streaming service - Simplified
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY environment variable is required");

const activeSessions = new Map<string, WebSocket>();
const inflightControllers = new Map<string, AbortController>();

// Simple base64 decode function
function b64decode(str: string): Uint8Array {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

// Safe JSON send with socket state check
function safeSendJSON(ws: WebSocket, obj: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(obj));
    } catch (e) {
      console.error("[TTS-WS] Failed to send JSON:", e);
    }
  }
}

serve(async (req) => {
  const upgrade = req.headers.get("upgrade")?.toLowerCase();
  const url = new URL(req.url);
  
  // Handle POST /tts for backend-initiated TTS
  if (req.method === "POST" && url.pathname === "/tts") {
    const secret = req.headers.get("x-internal-secret");
    const expectedSecret = Deno.env.get("INTERNAL_TTS_SECRET");
    if (expectedSecret && secret !== expectedSecret) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    try {
      const { sessionId, text, voice = "alloy", requestId, chat_id } = await req.json();
      if (!sessionId || !text) {
        return new Response("Missing sessionId or text", { status: 400 });
      }
      if (!activeSessions.has(sessionId)) {
        return new Response("Session not connected", { status: 404 });
      }
      
      const finalRequestId = requestId ?? crypto.randomUUID();
      await processTtsRequest(sessionId, text, voice, finalRequestId, chat_id);
      return new Response("OK");
    } catch (error) {
      console.error("[TTS-WS] POST /tts error:", error);
      return new Response("Internal error", { status: 500 });
    }
  }
  
  // Handle legacy POST requests
  if (req.method === "POST") {
    return new Response(
      JSON.stringify({ error: "HTTP POST not supported. Use WebSocket for TTS streaming." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  
  if (upgrade !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  try {
    const { socket, response } = Deno.upgradeWebSocket(req);
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      try { socket.close(1008, "Missing sessionId"); } catch {}
      return response;
    }

    activeSessions.set(sessionId, socket);
    console.log(`[TTS-WS] Connected session=${sessionId}, active=${activeSessions.size}`);

    socket.onmessage = async (event) => {
      let payload: any;
      try {
        if (typeof event.data === "string") {
          payload = JSON.parse(event.data);
        } else if (event.data instanceof ArrayBuffer) {
          const text = new TextDecoder().decode(new Uint8Array(event.data));
          payload = JSON.parse(text);
        } else {
          console.error(`[TTS-WS] Non-text/binary JSON message received, session=${sessionId}`);
          return;
        }
      } catch (e) {
        console.error(`[TTS-WS] JSON parse error, session=${sessionId}:`, e);
        safeSendJSON(socket, { error: "Invalid JSON" });
        return;
      }

      console.log(`[TTS-WS] Received message from session ${sessionId}:`, payload);

      const type = payload?.type;
      if (type === "ping") {
        safeSendJSON(socket, { type: "pong" });
        return;
      }
      if (type === "register") {
        safeSendJSON(socket, { type: "registered", sessionId });
        return;
      }

      // Support both new and legacy shapes: text | input
      const text = payload?.text ?? payload?.input;
      const voice = payload?.voice ?? "alloy";
      const chat_id = payload?.chat_id ?? payload?.chatId ?? null;
      const requestId = payload?.requestId ?? crypto.randomUUID();

      if (type === "tts" || text) {
        if (!text) {
          console.error(`[TTS-WS] Missing text for session ${sessionId}`);
          safeSendJSON(socket, { error: "Missing required field: text" });
          return;
        }
        
        console.log(`[TTS-WS] TTS request for session ${sessionId}, text: "${text.substring(0, 50)}...", voice: ${voice}, chat_id: ${chat_id ?? "n/a"}, requestId: ${requestId}`);
        
        // If a previous stream is running for this session, abort it
        const existing = inflightControllers.get(sessionId);
        if (existing) {
          console.warn(`[TTS-WS] Aborting previous TTS for session=${sessionId}`);
          existing.abort("superseded");
          inflightControllers.delete(sessionId);
        }
        await processTtsRequest(sessionId, text, voice, requestId, chat_id);
        return;
      }
    };

    socket.onclose = () => {
      console.log(`[TTS-WS] Session ${sessionId} disconnected`);
      activeSessions.delete(sessionId);
      
      // Abort any in-flight TTS for this session
      const controller = inflightControllers.get(sessionId);
      if (controller) {
        console.log(`[TTS-WS] Aborting TTS for disconnected session ${sessionId}`);
        controller.abort("client disconnected");
        inflightControllers.delete(sessionId);
      }
    };

    return response;
  } catch (err) {
    console.error("[TTS-WS] WebSocket upgrade failed:", err);
    return new Response("WebSocket upgrade failed", { status: 500 });
  }
});

async function processTtsRequest(sessionId: string, text: string, voice: string, requestId: string, chat_id?: string) {
  const socket = activeSessions.get(sessionId);
  if (!socket) {
    console.error(`[TTS-WS] No socket for session=${sessionId}`);
    return;
  }

  safeSendJSON(socket, { type: "stream-start", requestId, chat_id });
  
  // Abort if client disconnects
  const controller = new AbortController();
  inflightControllers.set(sessionId, controller);

  try {
    console.log(`[TTS-WS] Starting OpenAI TTS for session=${sessionId}, text="${text.substring(0, 50)}..."`);
    
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "OpenAI-Beta": "responses=v1"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        input: text,
        audio: {
          voice: voice,
          format: "pcm16",
          sample_rate: 24000
        },
        stream: true
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TTS-WS] OpenAI API error: ${response.status} ${errorText}`);
      safeSendJSON(socket, { error: `OpenAI API error: ${response.status}` });
      return;
    }

    console.log(`[TTS-WS] OpenAI API call successful, streaming audio for session=${sessionId}`);
    await streamSSEToSocket(sessionId, response.body!, socket, controller.signal, requestId);
  } catch (e) {
    if ((e as any)?.name === "AbortError") {
      console.log(`[TTS-WS] TTS aborted for session=${sessionId}`);
    } else {
      console.error(`[TTS-WS] TTS error for session=${sessionId}:`, e);
      safeSendJSON(socket, { error: "TTS processing failed" });
    }
  } finally {
    inflightControllers.delete(sessionId);
  }
}

async function streamSSEToSocket(
  sessionId: string,
  body: ReadableStream<Uint8Array>,
  socket: WebSocket,
  signal: AbortSignal,
  requestId: string
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let deltaCount = 0;
  let totalBytes = 0;
  let noDeltaTimer: number | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal.aborted) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (signal.aborted) break;
        if (!line.trim() || line.startsWith(":")) continue;

        const colonIndex = line.indexOf(":");
        if (colonIndex === -1) continue;

        const eventType = line.substring(0, colonIndex).trim();
        let data = line.substring(colonIndex + 1).trim();
        
        // Handle multi-line data
        if (data.startsWith('"') && data.endsWith('"')) {
          data = data.slice(1, -1);
        }

        if (!data) continue;
        if (data === "[DONE]") {
          safeSendJSON(socket, { type: "stream-end", requestId });
          console.log(`[TTS-WS] Stream complete session=${sessionId}, requestId=${requestId}`);
          return;
        }

        if (eventType === "data") {
          try {
            const parsed = JSON.parse(data);
            const t = parsed.type;
            
            if (t === "response.audio.delta" || t === "response.output_audio.delta") {
              const audioDelta = parsed.audio_delta;
              if (audioDelta && audioDelta.data) {
                const pcmBytes = b64decode(audioDelta.data);
                const int16Array = new Int16Array(pcmBytes.buffer, pcmBytes.byteOffset, pcmBytes.length / 2);
                
                deltaCount++;
                totalBytes += int16Array.byteLength;
                
                if (deltaCount % 10 === 0) {
                  console.log(`[TTS-WS] Forwarded ${deltaCount} PCM chunks (${totalBytes} bytes) for session=${sessionId}`);
                }
                
                if (socket.readyState === WebSocket.OPEN) {
                  socket.send(int16Array.buffer);
                }
                
                                 // Clear no-delta timer on first chunk
                 if (deltaCount === 1 && noDeltaTimer !== null) {
                   clearTimeout(noDeltaTimer);
                   noDeltaTimer = null;
                 }
              }
                         } else if (t === "response.completed") {
               if (noDeltaTimer !== null) {
                 clearTimeout(noDeltaTimer);
               }
               safeSendJSON(socket, { type: "stream-end", requestId });
              console.log(`[TTS-WS] OpenAI completed session=${sessionId}, chunks=${deltaCount}, bytes=${totalBytes}, requestId=${requestId}`);
              return;
            } else if (t === "response.text.delta") {
              // Ignore text deltas for TTS
            } else {
              console.log(`[TTS-WS] Unknown event type: ${t}`);
            }
          } catch (e) {
            console.error(`[TTS-WS] JSON parse error in SSE:`, e);
          }
        }
      }
    }
  } catch (e) {
    if ((e as any)?.name === "AbortError") {
      console.log(`[TTS-WS] SSE stream aborted for session=${sessionId}`);
    } else {
      console.error(`[TTS-WS] SSE stream error for session=${sessionId}:`, e);
    }
  } finally {
    reader.releaseLock();
  }
}