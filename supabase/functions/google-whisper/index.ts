// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
};

function mapMimeToGoogleEncoding(mimeType: string): { encoding: string; sampleRateHertz?: number } {
  const lower = (mimeType || '').toLowerCase();
  if (lower.includes('webm')) {
    return { encoding: 'WEBM_OPUS' };
  }
  if (lower.includes('ogg')) {
    return { encoding: 'OGG_OPUS' };
  }
  if (lower.includes('wav')) {
    return { encoding: 'LINEAR16' };
  }
  if (lower.includes('mp3')) {
    return { encoding: 'MP3' };
  }
  return { encoding: 'ENCODING_UNSPECIFIED' };
}

function normalizeLanguageCode(language?: string | null): string {
  if (!language) return 'en-US';
  const lower = language.toLowerCase();
  if (lower === 'en') return 'en-US';
  return language;
}

// Encode large Uint8Array to base64 without exceeding the call stack by chunking
function base64EncodeUint8(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192; // 8KB chunks to avoid exceeding argument limits
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    let chunkStr = '';
    for (let j = 0; j < sub.length; j++) {
      chunkStr += String.fromCharCode(sub[j]);
    }
    binary += chunkStr;
  }
  return btoa(binary);
}

async function transcribeWithGoogle({
  apiKey,
  audioBytes,
  mimeType,
  languageCode,
}: {
  apiKey: string;
  audioBytes: Uint8Array;
  mimeType: string;
  languageCode: string;
}): Promise<string> {
  const encodingInfo = mapMimeToGoogleEncoding(mimeType);

  const audioContent = base64EncodeUint8(audioBytes);
  const config: Record<string, unknown> = {
    encoding: encodingInfo.encoding,
    languageCode,
    enableAutomaticPunctuation: true,
  };
  if (encodingInfo.sampleRateHertz) {
    config.sampleRateHertz = encodingInfo.sampleRateHertz;
  }

  const resp = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      config,
      audio: { content: audioContent },
    }),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Google STT error: ${resp.status} - ${errorText}`);
  }

  const result = await resp.json();
  const transcript = Array.isArray(result.results)
    ? result.results
        .flatMap((r: any) => Array.isArray(r.alternatives) ? r.alternatives : [])
        .map((a: any) => a.transcript || '')
        .filter((t: string) => t && t.trim().length > 0)
        .join(' ')
    : '';

  return transcript || '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const warmupHeader = req.headers.get('X-Warmup');
    if (warmupHeader === '1') {
      console.log('[google-whisper] 🔥 Warmup request received');
      return new Response(JSON.stringify({ status: 'warmed up' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const chat_id = (form.get('chat_id') as string) || undefined;
    const chattype = (form.get('chattype') as string) || undefined;
    const mode = (form.get('mode') as string) || undefined;
    const language = (form.get('language') as string) || 'en';
    const voice = (form.get('voice') as string) || undefined;

    if (!file) {
      throw new Error('Missing file in form-data');
    }

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = new Uint8Array(arrayBuffer);
    const mimeType = file.type || 'audio/webm';

    console.log('[google-whisper] 📥 RECEIVED:', {
      audioSize: audioBuffer.length,
      mode,
      chat_id,
      mimeType,
      voice
    });

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Empty audio data - please try recording again');
    }

    const googleApiKey = Deno.env.get('GOOGLE-STT');
    if (!googleApiKey) {
      throw new Error('Google STT API key not configured (GOOGLE-STT)');
    }

    const languageCode = normalizeLanguageCode(language);
    const transcript = await transcribeWithGoogle({
      apiKey: googleApiKey,
      audioBytes: audioBuffer,
      mimeType,
      languageCode,
    });

    if (!transcript || transcript.trim().length === 0) {
      console.log('[google-whisper] ⚠️ Empty transcript - returning empty result');
      return new Response(
        JSON.stringify({ transcript: '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[google-whisper] ✅ SUCCESS: Transcript received', {
      transcriptPreview: transcript.substring(0, 100) + (transcript.length > 100 ? '...' : '')
    });

    // For voice mode: Save user message and call LLM separately
    if (chattype === 'voice' && chat_id) {
      console.log('[google-whisper] 🔄 VOICE MODE: Saving user message and calling LLM');
      
      // Fire and forget: Save user message to chat-send
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/chat-send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id,
          text: transcript,
          client_msg_id: crypto.randomUUID(),
          chattype: 'voice',
          mode: mode
        })
      }).catch((error) => {
        console.error('[google-whisper] ❌ User message save failed:', error);
      });

      // Fire and forget: Call LLM
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/llm-handler-gemini`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id,
          text: transcript,
          chattype: 'voice',
          mode: mode,
          voice
        })
      }).catch((error) => {
        console.error('[google-whisper] ❌ LLM call failed:', error);
      });

      // Broadcast thinking-mode to WebSocket
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/broadcast`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: `conversation:${chat_id}`,
          event: 'thinking-mode',
          payload: { transcript }
        })
      }).then(() => {
        console.log('[google-whisper] ✅ thinking-mode broadcast sent');
      }).catch((error) => {
        console.error('[google-whisper] ❌ thinking-mode broadcast failed:', error);
      });
    }

    return new Response(
      JSON.stringify({ transcript }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[google-whisper] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


