

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_TTS_API_KEY = Deno.env.get("GOOGLE-TTS") ?? "";

function b64ToBytes(b64: string) {
  // atob exists in Deno, but guard for safety
  const bin = (globalThis as any).atob ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    if (!GOOGLE_TTS_API_KEY) {
      console.error("[tts-speak] Missing GOOGLE_TTS env var");
      return new Response(JSON.stringify({ error: "server_misconfig: missing GOOGLE_TTS" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const { conversationId, messageId, text, voice } = await req.json();
    console.log("[tts-speak] Request:", {
      chat_id: conversationId,
      messageId,
      textLength: text?.length ?? 0,
      voice,
    });

    if (!conversationId || !messageId || !text) {
      return new Response(JSON.stringify({ error: "missing fields: conversationId, messageId, text" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Derive TTS voice + language
    const name: string = (voice && typeof voice === "string" && voice.length > 0) ? voice : "en-US-Neural2-F";
    let languageCode = "en-US";
    try {
      const parts = name.split("-");
      if (parts.length >= 2) languageCode = `${parts[0]}-${parts[1]}`;
    } catch { /* noop */ }

    // Call Google TTS
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(GOOGLE_TTS_API_KEY)}`;
    console.log("[tts-speak] Hitting:", url);

    const ttsRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode, name },
        audioConfig: { audioEncoding: "MP3", speakingRate: 1.0, pitch: 0.0 },
      }),
    });

    // Handle API errors with helpful hints
    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      console.error("[tts-speak] Google TTS error:", ttsRes.status, errText);

      // Common 403 hints surfaced for you
      const hints: string[] = [];
      if (ttsRes.status === 403) {
        hints.push(
          "Check: API is enabled on THIS project (Text-to-Speech API / texttospeech.googleapis.com).",
          "Check: Key restrictions — either remove temporarily or ensure API restriction includes Text-to-Speech API.",
          "Check: Application restrictions (HTTP referrer/IP) match how this Edge Function calls Google."
        );
      }

      return new Response(JSON.stringify({
        error: `google_tts_${ttsRes.status}`,
        detail: errText,
        hints,
      }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const json = await ttsRes.json();
    const audioContent = json?.audioContent;
    if (!audioContent) {
      console.error("[tts-speak] No audioContent in response");
      return new Response(JSON.stringify({ error: "no_audio_content_returned" }), {
        status: 502,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const bytes = b64ToBytes(audioContent);
    console.log("[tts-speak] OK, bytes:", bytes.byteLength);

    return new Response(bytes, {
      status: 200,
      headers: {
        ...CORS,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("[tts-speak] Unexpected error:", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});