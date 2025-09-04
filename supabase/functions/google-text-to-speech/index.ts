import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const GOOGLE_TTS_API_KEY = Deno.env.get("GOOGLE-TTS") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Tunables
const TTS_TIMEOUT_MS = Number(Deno.env.get("GOOGLE_TTS_TIMEOUT_MS") ?? 7000);
const CHUNK_SIZE_CHARS = Number(Deno.env.get("BROADCAST_CHUNK_SIZE_CHARS") ?? 200_000); // ~200 KB base64 chunks
const DEBUG = Deno.env.get("DEBUG") === "1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BROADCAST_ENDPOINT = `${SUPABASE_URL}/realtime/v1/api/broadcast`;

function log(...args: unknown[]) {
  if (DEBUG) console.log(...args);
}

async function broadcast(channel: string, event: string, payload: unknown) {
  const res = await fetch(BROADCAST_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      channel,
      event,
      payload,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Realtime HTTP broadcast failed: ${res.status} ${res.statusText} - ${txt}`);
  }
}

async function sha1(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-1", data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function buildVoiceName(voice: string): string {
  const v = voice.trim();
  // If already fully-qualified (e.g., en-US-Chirp3-HD-Puck, en-GB-Studio-B)
  if (/^[a-z]{2}-[A-Z]{2}-/.test(v)) return v;
  // If caller sends family + name (e.g., Chirp3-HD-Puck)
  if (v.startsWith("Chirp3-HD-")) return `en-US-${v}`;
  // Back-compat with your previous scheme (e.g., "Puck" -> "en-US-Chirp3-HD-Puck")
  return `en-US-Chirp3-HD-${v}`;
}

function languageFromVoiceName(name: string): string {
  const m = name.match(/^([a-z]{2}-[A-Z]{2})-/);
  return m ? m[1] : "en-US";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const startTime = performance.now();

  try {
    if (!GOOGLE_TTS_API_KEY) throw new Error("Missing GOOGLE-TTS key");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase env");

    const { chat_id, text, voice } = await req.json().catch(() => ({}));

    if (!chat_id || typeof chat_id !== "string") throw new Error("chat_id required");
    if (!text || typeof text !== "string" || text.trim().length === 0) throw new Error("text required");
    if (!voice || typeof voice !== "string") throw new Error("voice required");

    // Use exact HD voice name provided by client, or construct it if you standardize internally.
    const voiceName = buildVoiceName(voice);
    const languageCode = languageFromVoiceName(voiceName);
    log("[google-tts] request", { chat_id, len: text.length, voiceName, languageCode });

    // Call Google TTS (single shot). Keep the payload minimal.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("TTS timeout"), TTS_TIMEOUT_MS);

    const ttsBody = {
      input: { text },
      voice: { languageCode, name: voiceName },
      audioConfig: { audioEncoding: "MP3" },
    };

    const ttsRes = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ttsBody),
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timeout));

    if (!ttsRes.ok) {
      const errTxt = await ttsRes.text().catch(() => "");
      throw new Error(`Google TTS error ${ttsRes.status}: ${errTxt}`);
    }

    const { audioContent } = await ttsRes.json();
    if (!audioContent || typeof audioContent !== "string") {
      throw new Error("No audioContent from Google TTS");
    }

    const processingTimeMs = Math.round(performance.now() - startTime);
    const channel = `conversation:${chat_id}`;
    const b64 = audioContent; // already base64
    const totalChars = b64.length;
    const totalChunks = Math.ceil(totalChars / CHUNK_SIZE_CHARS);

    // Build a stable id for dedupe client-side if desired
    const ttsId = await sha1(`${voiceName}::${text}`);

    // Broadcast work happens outside the request lifecycle
    const work = (async () => {
      try {
        // Start event with metadata
        await broadcast(channel, "tts-start", {
          id: ttsId,
          chat_id,
          text,
          voice: voiceName,
          mimeType: "audio/mpeg",
          encoding: "base64",
          totalChunks,
          sizeBase64Chars: totalChars,
          processingTimeMs,
        });

        // Chunked payload
        for (let i = 0; i < totalChunks; i++) {
          const begin = i * CHUNK_SIZE_CHARS;
          const end = Math.min(begin + CHUNK_SIZE_CHARS, totalChars);
          const chunk = b64.slice(begin, end);

          await broadcast(channel, "tts-chunk", {
            id: ttsId,
            index: i,
            total: totalChunks,
            data: chunk,
          });
        }

        // End event
        await broadcast(channel, "tts-end", {
          id: ttsId,
          chat_id,
          totalChunks,
          done: true,
        });
      } catch (e) {
        console.error("[google-tts] broadcast error:", e);
        await broadcast(channel, "tts-error", {
          id: ttsId,
          error: e?.message || String(e),
        }).catch(() => {});
      }
    })();

    // Don't block the HTTP response on broadcasts
    // @ts-ignore EdgeRuntime.waitUntil is available in Supabase Edge Functions
    EdgeRuntime?.waitUntil?.(work);

    // Immediate HTTP response
    return new Response(
      JSON.stringify({ success: true, id: ttsId }),
      {
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
          "Server-Timing": `tts;dur=${processingTimeMs}`,
        },
      }
    );
  } catch (err) {
    console.error("[google-tts] error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Unknown error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});