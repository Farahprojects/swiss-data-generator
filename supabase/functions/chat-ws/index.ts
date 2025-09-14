import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type WSMessage =
  | { type: "send_message"; chat_id: string; text: string; client_msg_id?: string; mode?: string }
  | { type: "ping" };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_LLM_TTS")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function sanitizePlainText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/[#*_\[\](){}]/g, '')
    .replace(/`+([^`]*)`+/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

serve((req) => {
  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = () => {
    try { socket.send(JSON.stringify({ type: 'ready' })); } catch {}
  };

  socket.onmessage = async (ev) => {
    try {
      const msg = JSON.parse(ev.data) as WSMessage;
      if (msg.type === 'ping') {
        try { socket.send(JSON.stringify({ type: 'pong' })); } catch {}
        return;
      }

      if (msg.type === 'send_message') {
        const { chat_id, text, client_msg_id, mode } = msg;
        if (!chat_id || !text) {
          try { socket.send(JSON.stringify({ type: 'error', error: 'Missing chat_id or text' })); } catch {}
          return;
        }

        // 1) Insert user message immediately
        const { error: insertUserError } = await supabase
          .from('messages')
          .insert({
            chat_id,
            role: 'user',
            text,
            client_msg_id,
            created_at: new Date().toISOString(),
          });
        if (insertUserError) {
          try { socket.send(JSON.stringify({ type: 'error', error: 'Failed to insert user message' })); } catch {}
          return;
        }

        // 2) Call Gemini (non-streaming), then stream chunks to client over WS
        const systemPrompt = `You are an insightful guide who speaks in plain, modern language yet thinks in energetic resonance with planetary influences.`;
        const contents: any[] = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'user', parts: [{ text }] }
        ];

        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents, generationConfig: { temperature: 0.4 } }),
          },
        );

        if (!resp.ok) {
          const errorText = await resp.text();
          try { socket.send(JSON.stringify({ type: 'error', error: 'LLM error', details: errorText })); } catch {}
          return;
        }

        const data = await resp.json();
        const assistantTextRaw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const assistantText = sanitizePlainText(assistantTextRaw);

        // 3) Stream tokenized chunks to client
        const words = assistantText.split(/(\s+)/); // keep spaces for natural flow
        let acc = '';
        for (const w of words) {
          acc += w;
          try { socket.send(JSON.stringify({ type: 'delta', client_msg_id, text: acc })); } catch {}
          // Small pacing to feel live; can tune
          await new Promise((r) => setTimeout(r, 20));
        }

        // 4) Insert assistant message to DB with same client_msg_id (for dedupe client-side)
        const { error: insertAssistantError } = await supabase
          .from('messages')
          .insert({
            chat_id,
            role: 'assistant',
            text: assistantText,
            client_msg_id,
            created_at: new Date().toISOString(),
            meta: { streamed: true, mode: mode || 'text' },
          });
        if (insertAssistantError) {
          try { socket.send(JSON.stringify({ type: 'error', error: 'Failed to insert assistant message' })); } catch {}
        }

        // 5) Finalize
        try { socket.send(JSON.stringify({ type: 'final', client_msg_id, text: assistantText })); } catch {}
        return;
      }
    } catch (e) {
      try { socket.send(JSON.stringify({ type: 'error', error: String(e?.message ?? e) })); } catch {}
    }
  };

  socket.onclose = () => {};
  socket.onerror = () => {};

  return response;
});


