// Production-ready, simplified llm-handler-gemini
// - Uses Deno.serve (no std/http)
// - Validates inputs, consistent CORS + JSON responses
// - Minimal logs, clear flow, graceful fallbacks
// - Fire-and-forget for TTS and chat-send

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
"Access-Control-Allow-Origin": "*",
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
"Access-Control-Allow-Methods": "POST, OPTIONS",
"Vary": "Origin"
};

const json = (status, data) =>
new Response(JSON.stringify(data), {
status,
headers: { ...corsHeaders, "Content-Type": "application/json" }
});

// Env
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const GOOGLE_API_KEY = Deno.env.get("GOOGLE-LLM-NEW");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
const GEMINI_TIMEOUT_MS = 30000;

if (!SUPABASE_URL) throw new Error("Missing env: SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
if (!GOOGLE_API_KEY) throw new Error("Missing env: GOOGLE-LLM-NEW");

// Supabase client (module scope)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Simple sanitizer: strips common markdown and extra whitespace
function sanitizePlainText(input) {
const s = typeof input === "string" ? input : "";
return s
.replace(/```[\s\S]*?```/g, "") // code blocks
.replace(/`([^`]+)`/g, "$1") // inline code
.replace(/!\[[^\]]+\]\([^)]+\)/g, "") // images
.replace(/\[[^\]]+\]\([^)]+\)/g, "$1") // links
.replace(/[>_~#*]+/g, "") // md symbols (including bold/italic *)
.replace(/-{3,}/g, " ")
.replace(/\s+/g, " ")
.trim();
}

const systemPrompt = `You are an AI guide for self-awareness.
Tone:
– Direct, a bit playful. Contractions welcome, dated slang not.

Lead with Human-centric translation and behavioral resonance, not planets or metaphors
Astro jargon not, just the translation in emotional/ meaning
Response Logic:
Acknowledge: One-word encourager.

Answer the user’s latest message first and fully.
Pull in recent convo context only when it preserves flow or adds nuance.
Use astrodata only if it adds real emotional or situational insight—otherwise skip

Show one-line "why" tying emotional/psychological pattern back to a core need or fear

Response output:
No labels , human led conversation

Check-in: Close with a simple, open question.`;

Deno.serve(async (req) => {
if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
if (req.method !== "POST") return json(405, { error: "Method not allowed" });

const startedAt = Date.now();

let body;
try {
body = await req.json();
} catch {
return json(400, { error: "Invalid JSON body" });
}

const { chat_id, text, mode, chattype, voice, user_id, user_name } = body || {};

if (!chat_id || typeof chat_id !== "string") return json(400, { error: "Missing or invalid field: chat_id" });
if (!text || typeof text !== "string") return json(400, { error: "Missing or invalid field: text" });

// Fetch recent messages (history + optional system)
const HISTORY_LIMIT = 6;
let allMessages = [];
try {
const { data, error } = await supabase
.from("messages")
.select("role, text, created_at")
.eq("chat_id", chat_id)
.eq("status", "complete")
.not("text", "is", null)
.neq("text", "")
.order("created_at", { ascending: false })
.limit(20);

if (error) {
  console.warn("[llm] messages fetch warning:", error.message);
} else {
  allMessages = data || [];
}
} catch (e) {
console.warn("[llm] messages fetch exception:", e?.message || String(e));
}

const history = allMessages.filter((m) => m.role !== "system").slice(0, HISTORY_LIMIT);
const systemMessages = allMessages
.filter((m) => m.role === "system")
.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
const systemText = systemMessages.length ? String(systemMessages[0].text || "") : "";

// Build Gemini request contents (oldest -> newest)
const contents = [];
for (let i = history.length - 1; i >= 0; i--) {
const m = history[i];
const t = typeof m.text === "string" ? m.text.trim() : "";
if (!t) continue;
contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: t }] });
}
contents.push({ role: "user", parts: [{ text: String(text) }] });

const combinedSystemInstruction = systemText ? `${systemPrompt}\n\n[System Data]\n${systemText}` : systemPrompt;

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const requestBody = {
system_instruction: { role: "system", parts: [{ text: combinedSystemInstruction }] },
contents,
generationConfig: { temperature: 0.7 }
};

let llmStartedAt = Date.now();
let data;
try {
const resp = await fetch(geminiUrl, {
method: "POST",
headers: { "Content-Type": "application/json", "x-goog-api-key": GOOGLE_API_KEY },
body: JSON.stringify(requestBody),
signal: controller.signal
});
clearTimeout(timeout);

if (!resp.ok) {
  const errText = await resp.text().catch(() => "");
  return json(502, { error: `Gemini API request failed: ${resp.status} - ${errText}` });
}

data = await resp.json();
} catch (e) {
clearTimeout(timeout);
return json(504, { error: `Gemini request error: ${e?.message || String(e)}` });
}

const llmLatencyMs = Date.now() - llmStartedAt;

// Extract assistant text
let assistantText = "";
try {
const parts = data?.candidates?.[0]?.content?.parts || [];
assistantText = parts.map((p) => p?.text || "").filter(Boolean).join(" ").trim();
} catch {
// ignore
}
if (!assistantText) return json(502, { error: "No response text from Gemini" });

const sanitizedText = sanitizePlainText(assistantText) || assistantText;

// Usage metadata (if present)
const usage = {
total_tokens: data?.usageMetadata?.totalTokenCount ?? null,
input_tokens: data?.usageMetadata?.promptTokenCount ?? null,
output_tokens: data?.usageMetadata?.candidatesTokenCount ?? null
};

// Fire-and-forget: TTS (voice only) and save assistant message via chat-send
const headers = {
"Content-Type": "application/json",
"Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
};

const assistantClientId = crypto.randomUUID();

const tasks = [
fetch(`${SUPABASE_URL}/functions/v1/chat-send`, {
method: "POST",
headers,
body: JSON.stringify({
chat_id,
text: sanitizedText,
client_msg_id: assistantClientId,
role: "assistant",
mode,
user_id,
user_name,
chattype
})
})
];

if (chattype === "voice") {
const selectedVoice = typeof voice === "string" && voice.trim() ? voice : "Puck";
tasks.push(
fetch(`${SUPABASE_URL}/functions/v1/google-text-to-speech`, {
method: "POST",
headers,
body: JSON.stringify({ text: sanitizedText, voice: selectedVoice, chat_id })
})
);
}

Promise.allSettled(tasks).catch(() => {});

const totalLatencyMs = Date.now() - startedAt;

return json(200, {
text: sanitizedText,
usage,
llm_latency_ms: llmLatencyMs,
total_latency_ms: totalLatencyMs
});
});
