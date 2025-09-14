import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { chat_id, text, client_msg_id, mode } = await req.json();
    if (!chat_id || !text) {
      return new Response('Missing chat_id or text', { status: 400 });
    }

    // Insert user message immediately (fail-fast if this fails)
    const { error: insertUserError } = await supabase
      .from('messages')
      .insert({ chat_id, role: 'user', text, client_msg_id, created_at: new Date().toISOString() });
    if (insertUserError) {
      return new Response('Failed to insert user message', { status: 500 });
    }

    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: string) => controller.enqueue(encoder.encode(`data: ${event}\n\n`));
        try {
          // Call Gemini (non-streaming for now)
          const systemPrompt = `You are an insightful guide who speaks in plain, modern language yet thinks in energetic resonance with planetary influences.`;
          const contents: any[] = [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'user', parts: [{ text }] },
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
            const errText = await resp.text();
            send(JSON.stringify({ type: 'error', error: 'LLM error', details: errText }));
            controller.close();
            return;
          }

          const data = await resp.json();
          const assistantTextRaw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          const assistantText = sanitizePlainText(assistantTextRaw);

          // Stream incremental chunks to client
          const words = assistantText.split(/(\s+)/);
          let acc = '';
          for (const w of words) {
            acc += w;
            send(JSON.stringify({ type: 'delta', client_msg_id, text: acc }));
            // pacing
            await new Promise((r) => setTimeout(r, 20));
          }

          // Insert assistant message at end
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
            send(JSON.stringify({ type: 'error', error: 'Failed to insert assistant message' }));
          }

          send(JSON.stringify({ type: 'final', client_msg_id, text: assistantText }));
        } catch (e) {
          send(JSON.stringify({ type: 'error', error: String(e?.message ?? e) }));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, { headers });
  } catch (e) {
    return new Response('Bad Request', { status: 400 });
  }
});


