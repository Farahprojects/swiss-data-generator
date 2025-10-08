// @ts-nocheck
/* eslint-disable */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const GOOGLE_TTS_API_KEY = Deno.env.get("GOOGLE-TTS") ?? "";
if (!GOOGLE_TTS_API_KEY) {
console.error("[google-tts] Missing GOOGLE-TTS API key");
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CORS_HEADERS = {
"Access-Control-Allow-Origin": "*",
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
"Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Simple in-memory cache (no DB) to reduce repeat TTS calls
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_ITEMS = 100;

type CacheEntry = { bytes: Uint8Array; expires: number };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Uint8Array>>();

function cacheKey(text: string, voiceName: string) {
return `${voiceName}::${text}`;
}
function getFromCache(key: string): Uint8Array | undefined {
const entry = cache.get(key);
if (!entry) return;
if (entry.expires < Date.now()) {
cache.delete(key);
return;
}
return entry.bytes;
}
function setCache(key: string, bytes: Uint8Array) {
cache.set(key, { bytes, expires: Date.now() + CACHE_TTL_MS });
if (cache.size > CACHE_MAX_ITEMS) {
// drop oldest
const oldest = [...cache.entries()].sort((a, b) => a[1].expires - b[1].expires);
const drop = oldest.length - CACHE_MAX_ITEMS;
for (let i = 0; i < drop; i++) cache.delete(oldest[i][0]);
}
}

async function synthesizeMP3(text: string, voiceName: string, signal?: AbortSignal): Promise<Uint8Array> {
  const resp = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_API_KEY}`,
{
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
input: { text },
voice: { languageCode: "en-US", name: voiceName },
audioConfig: { audioEncoding: "MP3" },
}),
signal,
}
);

if (!resp.ok) {
const errText = await resp.text().catch(() => "");
throw new Error(`Google TTS API error (${resp.status}): ${errText}`);
}

const json = await resp.json();
if (!json?.audioContent) {
throw new Error("Google TTS API returned no audioContent");
}

// More efficient than atob + charCode loop
return decodeBase64(json.audioContent);
}

function fireAndForget(p: Promise<unknown>) {
try {
// If EdgeRuntime.waitUntil exists, use it. Otherwise just start promise.
const maybeEdge = (globalThis as any).EdgeRuntime;
if (maybeEdge && typeof maybeEdge.waitUntil === "function") {
maybeEdge.waitUntil(p);
} else {
// Best-effort fire-and-forget
p.catch((e: unknown) => console.error("[google-tts] async error:", e));
}
} catch {
// ignore
}
}

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
async function signPayload(text: string, voice: string, exp: number): Promise<string> {
  const data = `${text}|${voice}|${exp}|${supabaseServiceKey}`;
  const enc = new TextEncoder().encode(data);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  // base64url encode
  const bytes = new Uint8Array(digest);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  const b64 = btoa(str).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return b64;
}

async function handleGet(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const text = url.searchParams.get("text") ?? "";
  const voice = url.searchParams.get("voice") ?? "";
  const expStr = url.searchParams.get("exp") ?? "0";
  const sig = url.searchParams.get("sig") ?? "";

  if (!text || !voice || !sig) {
    return new Response(JSON.stringify({ error: "Missing required query params" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) {
    return new Response(JSON.stringify({ error: "URL expired" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const expected = await signPayload(text, voice, exp);
  if (expected !== sig) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const voiceName = `en-US-Chirp3-HD-${voice}`;
    const key = cacheKey(text, voiceName);
    let audioBytes = getFromCache(key);
    if (!audioBytes) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        audioBytes = await synthesizeMP3(text, voiceName, controller.signal);
      } finally {
        clearTimeout(timeout);
      }
      setCache(key, audioBytes);
    }

    // Stream the bytes to the client. Browsers will begin playback as data arrives.
    return new Response(audioBytes, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
}

serve(async (req) => {
const startTime = Date.now();

console.log('[google-tts] 🚀 FIRST: Function started - processing TTS request');

if (req.method === "OPTIONS") {
return new Response(null, { status: 204, headers: CORS_HEADERS });
}

  if (req.method === "GET") {
    return await handleGet(req);
  }

try {
const { chat_id, text, voice } = await req.json();

if (!chat_id || !text) {
  throw new Error("Missing 'chat_id' or 'text' in request body.");
}
if (!voice) {
  throw new Error("Voice parameter is required - no fallback allowed");
}

const voiceName = `en-US-Chirp3-HD-${voice}`;

// cache + inflight de-dup
const key = cacheKey(text, voiceName);
let audioBytes = getFromCache(key);
if (!audioBytes) {
  let pending = inflight.get(key);
  if (!pending) {
    // Optional: timeout to avoid hanging requests
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s
    pending = synthesizeMP3(text, voiceName, controller.signal)
      .finally(() => {
        clearTimeout(timeout);
        inflight.delete(key);
      });
    inflight.set(key, pending);
  }
  audioBytes = await pending;
  setCache(key, audioBytes);
}

const processingTime = Date.now() - startTime;

// Prepare a short-lived signed URL for progressive playback
const expires = Date.now() + 2 * 60 * 1000; // 2 minutes
const sig = await signPayload(text, voice, expires);
const audioUrl = `${supabaseUrl}/functions/v1/google-text-to-speech?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}&exp=${expires}&sig=${sig}`;

// Fire-and-forget broadcast (frontend will prefer URL but keeps bytes for fallback)
fireAndForget(
  supabase
    .channel(`conversation:${chat_id}`)
    .send({
      type: "broadcast",
      event: "tts-ready",
      payload: {
        audioBytes: Array.from(audioBytes),
        audioUrl,
        text,
        chat_id,
        mimeType: "audio/mpeg",
        size: audioBytes.length,
      },
    })
    .then(({ error: broadcastError }) => {
      if (broadcastError) {
        console.error("[google-tts] Failed to broadcast:", broadcastError);
      }
    })
    .catch((e) => console.error("[google-tts] Broadcast error:", e))
);

// Minimal response
const responseData = { success: true, audioUrl, storagePath: null };
console.log('[google-tts] ✅ LAST: Function completed - returning response with TTS audio broadcast');
return new Response(JSON.stringify(responseData), {
  headers: {
    ...CORS_HEADERS,
    "Content-Type": "application/json",
    "Server-Timing": `tts;dur=${processingTime}`,
  },
});
} catch (error: any) {
console.error("[google-tts] Error:", error);
return new Response(
JSON.stringify({ error: error?.message ?? String(error) }),
{ status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
);
}
});
