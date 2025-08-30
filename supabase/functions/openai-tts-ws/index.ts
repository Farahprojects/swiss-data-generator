// OpenAI Realtime TTS WebSocket streaming service - Production Hardened
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode as b64decode } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY environment variable is required");

const activeSessions = new Map<string, WebSocket>();
const inflightControllers = new Map<string, AbortController>();

serve(async (req) => {
  const upgrade = req.headers.get("upgrade")?.toLowerCase();
  const url = new URL(req.url);
  
  // Handle POST /tts for backend-initiated TTS
  if (req.method === "POST" && url.pathname === "/tts") {
    const secret = req.headers.get("x-internal-secret");
    if (secret !== Deno.env.get("INTERNAL_TTS_SECRET")) {
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

      console.log(`[TTS-WS] Ignored message (no tts/text), session=${sessionId}:`, payload?.type ?? "unknown");
    };

    socket.onerror = (err) => {
      console.error(`[TTS-WS] WebSocket error, session=${sessionId}:`, err);
    };

    socket.onclose = (_) => {
      // Cleanup session and abort any inflight fetch
      activeSessions.delete(sessionId);
      const c = inflightControllers.get(sessionId);
      if (c) {
        c.abort("client disconnected");
        inflightControllers.delete(sessionId);
      }
      console.log(`[TTS-WS] Disconnected session=${sessionId}, active=${activeSessions.size}`);
    };

    return response;
  } catch (e) {
    console.error("[TTS-WS] Upgrade to WebSocket failed:", e);
    return new Response("WebSocket upgrade failed", { status: 500 });
  }
});

function safeSendJSON(ws: WebSocket, obj: unknown) {
  try {
    if (ws.readyState === ws.CLOSED || ws.readyState === ws.CLOSING) return;
    ws.send(JSON.stringify(obj));
  } catch (e) {
    console.warn("[TTS-WS] send JSON failed:", e);
  }
}

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
    console.log(`[TTS-WS] Calling OpenAI (responses) session=${sessionId}, textLen=${text.length}`);
    const body = {
      model: "gpt-4o-mini-tts",
      input: text,
      audio: { voice, format: "pcm16", sample_rate: 24000 },
      stream: true
    };
    
    console.log(`[TTS-WS] OpenAI request body for session ${sessionId}:`, JSON.stringify(body, null, 2));
    
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "OpenAI-Beta": "responses=v1"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    console.log(`[TTS-WS] OpenAI status=${res.status} session=${sessionId}`);
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[TTS-WS] OpenAI error session=${sessionId}: ${res.status} ${errText}`);
      safeSendJSON(socket, { error: `OpenAI error ${res.status}` });
      return;
    }
    if (!res.body) {
      console.error(`[TTS-WS] OpenAI empty body session=${sessionId}`);
      safeSendJSON(socket, { error: "No response body from OpenAI" });
      return;
    }

    await streamSSEToSocket(sessionId, res.body, socket, controller.signal, requestId);
  } catch (e) {
    if ((e as any)?.name === "AbortError") {
      console.warn(`[TTS-WS] OpenAI fetch aborted session=${sessionId}`);
    } else {
      console.error(`[TTS-WS] OpenAI fetch failed session=${sessionId}:`, e);
      safeSendJSON(socket, { error: "Failed to connect to OpenAI API" });
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
  const textDecoder = new TextDecoder();
  let buf = "";
  let deltaCount = 0;
  let totalBytes = 0;

  const noDeltaTimer = setTimeout(() => {
    if (deltaCount === 0) {
      console.error(`[TTS-WS] No audio deltas in 2s session=${sessionId}`);
      safeSendJSON(socket, { error: "No audio deltas received" });
    }
  }, 2000);

  try {
    while (true) {
      if (signal.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;

      buf += textDecoder.decode(value, { stream: true });

      // Handle CRLF and multi-line SSE events
      let idx: number;
      while ((idx = buf.indexOf("\n\n")) >= 0 || (idx = buf.indexOf("\r\n\r\n")) >= 0) {
        const raw = buf.slice(0, idx);
        buf = buf.slice(idx + (raw.includes("\r\n") ? 4 : 2));

        const lines = raw.split(/\r?\n/);
        let dataChunks: string[] = [];
        // We only need data: lines for OpenAI responses
        for (const line of lines) {
          if (line.startsWith("data:")) {
            dataChunks.push(line.slice(5).trimStart());
          }
        }
        const data = dataChunks.join("\n");
        if (!data) continue;
        if (data === "[DONE]") {
          safeSendJSON(socket, { type: "stream-end", requestId });
          console.log(`[TTS-WS] Stream complete session=${sessionId}, requestId=${requestId}`);
          return;
        }

        let evt: any;
        try {
          evt = JSON.parse(data);
        } catch (e) {
          console.warn(`[TTS-WS] SSE JSON parse error session=${sessionId}:`, e);
          continue;
        }

        console.log(`[TTS-WS] SSE event for session ${sessionId}:`, evt.type);

        const t = evt?.type;
        if (t === "response.audio.delta" || t === "response.output_audio.delta") {
          // OpenAI sends base64 audio in evt.delta
          const base64: string = evt.delta ?? evt?.audio?.data;
          if (!base64) continue;

          const bytes: Uint8Array = b64decode(base64);
          // Ensure 16-bit alignment
          const usable = bytes.subarray(0, bytes.byteLength - (bytes.byteLength % 2));
          if (socket.readyState === socket.OPEN) {
            try {
              socket.send(usable.buffer.slice(usable.byteOffset, usable.byteOffset + usable.byteLength));
              console.log(`[TTS-WS] Sending PCM chunk ${deltaCount + 1} to session ${sessionId}: ${usable.length} samples, ${usable.byteLength} bytes`);
            } catch (e) {
              console.warn(`[TTS-WS] socket.send failed session=${sessionId}:`, e);
              return;
            }
          } else {
            console.warn(`[TTS-WS] Socket not open, stopping session=${sessionId}`);
            return;
          }
          deltaCount++;
          totalBytes += usable.byteLength;
          if (deltaCount === 1) clearTimeout(noDeltaTimer);
          if (deltaCount % 10 === 0) {
            console.log(`[TTS-WS] Sent ${deltaCount} chunks, ${totalBytes} bytes session=${sessionId}`);
          }
        } else if (t === "response.completed") {
          clearTimeout(noDeltaTimer);
          safeSendJSON(socket, { type: "stream-end", requestId });
          console.log(`[TTS-WS] OpenAI completed session=${sessionId}, chunks=${deltaCount}, bytes=${totalBytes}, requestId=${requestId}`);
          return;
        } else if (t === "response.text.delta") {
          // Optional: log text deltas
          console.log(`[TTS-WS] Text delta: ${evt.delta}`);
        }
      }
    }
  } catch (e) {
    if ((e as any)?.name !== "AbortError") {
      console.error(`[TTS-WS] SSE stream error session=${sessionId}:`, e);
      safeSendJSON(socket, { error: "SSE streaming failed" });
    }
  } finally {
    clearTimeout(noDeltaTimer);
    try { reader.releaseLock(); } catch {}
  }
}