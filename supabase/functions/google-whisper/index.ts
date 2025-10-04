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

function stripPemHeaderFooter(pem: string): Uint8Array {
  const cleaned = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const raw = atob(cleaned);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function base64UrlEncode(bytes: Uint8Array): string {
  const b64 = base64Encode(bytes);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function importPrivateKeyRS256(pem: string): Promise<CryptoKey> {
  const pkcs8 = stripPemHeaderFooter(pem);
  return await crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function createServiceAccountJwt(clientEmail: string, privateKeyPem: string, scopes: string[]): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(JSON.stringify(header));
  const payloadBytes = encoder.encode(JSON.stringify(payload));
  const signingInput = `${base64UrlEncode(headerBytes)}.${base64UrlEncode(payloadBytes)}`;

  const key = await importPrivateKeyRS256(privateKeyPem);
  const signature = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(signingInput))
  );
  const jwt = `${signingInput}.${base64UrlEncode(signature)}`;
  return jwt;
}

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  let sa: any;
  try {
    sa = JSON.parse(serviceAccountJson);
  } catch (_e) {
    throw new Error('Invalid GOOGLE-STT service account JSON');
  }

  const clientEmail = sa.client_email;
  const privateKey = sa.private_key;
  if (!clientEmail || !privateKey) {
    throw new Error('GOOGLE-STT is missing client_email or private_key');
  }

  const jwt = await createServiceAccountJwt(clientEmail, privateKey, [
    'https://www.googleapis.com/auth/cloud-platform',
  ]);

  const body = new URLSearchParams();
  body.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  body.set('assertion', jwt);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google OAuth token error: ${tokenRes.status} - ${errText}`);
  }

  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    throw new Error('Google OAuth token response missing access_token');
  }
  return accessToken;
}

async function transcribeWithGoogle({
  accessToken,
  audioBytes,
  mimeType,
  languageCode,
}: {
  accessToken: string;
  audioBytes: Uint8Array;
  mimeType: string;
  languageCode: string;
}): Promise<string> {
  const encodingInfo = mapMimeToGoogleEncoding(mimeType);

  const audioContent = btoa(String.fromCharCode(...audioBytes));
  const config: Record<string, unknown> = {
    encoding: encodingInfo.encoding,
    languageCode,
    enableAutomaticPunctuation: true,
  };
  if (encodingInfo.sampleRateHertz) {
    config.sampleRateHertz = encodingInfo.sampleRateHertz;
  }

  const resp = await fetch('https://speech.googleapis.com/v1p1beta1/speech:recognize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
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

    const googleServiceAccount = Deno.env.get('GOOGLE-STT');
    if (!googleServiceAccount) {
      throw new Error('Google STT service account not configured (GOOGLE-STT)');
    }

    const accessToken = await getGoogleAccessToken(googleServiceAccount);
    const languageCode = normalizeLanguageCode(language);
    const transcript = await transcribeWithGoogle({
      accessToken,
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


