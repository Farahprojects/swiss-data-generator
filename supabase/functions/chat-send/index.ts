// Simplified, production-ready version
// - Uses Deno.serve (no std/http dependency)
// - Validates input and fails fast on missing env vars
// - Single path for saving messages (role inferred)
// - Awaits DB insert; fires LLM call asynchronously when needed
// - Consistent JSON responses and CORS handling

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
"Access-Control-Allow-Origin": "*",
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
"Access-Control-Allow-Methods": "POST, OPTIONS",
"Vary": "Origin"
};

// Fail fast if env vars are missing
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL) throw new Error("Missing env: SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");

// Create Supabase client once
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
auth: { persistSession: false }
});

const json = (status, data) =>
new Response(JSON.stringify(data), {
status,
headers: { ...corsHeaders, "Content-Type": "application/json" }
});

Deno.serve(async (req) => {
if (req.method === "OPTIONS") {
return new Response("ok", { headers: corsHeaders });
}

if (req.method !== "POST") {
return json(405, { error: "Method not allowed" });
}

let body;
try {
body = await req.json();
} catch {
return json(400, { error: "Invalid JSON body" });
}

const {
chat_id,
text,
client_msg_id,
mode,
chattype,
role: rawRole,
user_id,
user_name
} = body || {};

if (!chat_id || typeof chat_id !== "string") {
return json(400, { error: "Missing or invalid field: chat_id" });
}
if (!text || typeof text !== "string") {
return json(400, { error: "Missing or invalid field: text" });
}
if (!mode || typeof mode !== "string") {
return json(400, { error: "Missing or invalid field: mode" });
}

const role = rawRole === "assistant" ? "assistant" : "user";
const message = {
chat_id,
role,
text,
client_msg_id: client_msg_id ?? crypto.randomUUID(),
status: "complete",
mode,
user_id: user_id ?? null,
user_name: user_name ?? null,
meta: {}
};

// FIRE-AND-FORGET: Start LLM immediately
const shouldStartLLM = role === "user" && chattype !== "voice";
if (shouldStartLLM) {
fetch(`${SUPABASE_URL}/functions/v1/llm-handler-gemini`, {
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
},
body: JSON.stringify({ chat_id, text, mode, user_id, user_name })
}).catch((err) => {
console.error("[chat-send] LLM call failed:", err);
});
}

// FIRE-AND-FORGET: DB insert (WebSocket + optimistic UI handle sync)
supabase
.from("messages")
.insert(message, {
onConflict: "client_msg_id",
ignoreDuplicates: true,
returning: "minimal"
}).then(({ error }) => {
if (error) {
console.error("[chat-send] DB insert failed:", error);
}
});

// Return immediately (no await)
return json(200, {
message: role === "assistant" ? "Assistant message saved" : "User message saved",
saved: message,
llm_started: shouldStartLLM
});
});
