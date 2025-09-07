/**
 * 🌊 STREAMING STT EDGE FUNCTION
 * 
 * Handles WebSocket streaming of Opus-encoded audio
 * Decodes Opus to PCM and streams to OpenAI Realtime API
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StreamingSttConfig {
  sampleRate: number;
  channels: number;
  frameSize: number;
  bitrate: number;
}

interface StreamingSttSession {
  chat_id: string;
  config: StreamingSttConfig;
  openaiClient: any;
  isConnected: boolean;
}

// Store active sessions
const sessions = new Map<string, StreamingSttSession>();

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Upgrade to WebSocket
  if (req.headers.get('upgrade') === 'websocket') {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    socket.onopen = () => {
      console.log('[streaming-stt] WebSocket connection opened');
    };

    socket.onmessage = async (event) => {
      try {
        const data = event.data;
        
        // Handle JSON messages (init, control)
        if (typeof data === 'string') {
          const message = JSON.parse(data);
          await handleControlMessage(socket, message);
        }
        // Handle binary data (Opus audio)
        else if (data instanceof ArrayBuffer) {
          await handleAudioData(socket, data);
        }
      } catch (error) {
        console.error('[streaming-stt] Message handling error:', error);
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message'
        }));
      }
    };

    socket.onclose = () => {
      console.log('[streaming-stt] WebSocket connection closed');
      // Cleanup session
      cleanupSession(socket);
    };

    socket.onerror = (error) => {
      console.error('[streaming-stt] WebSocket error:', error);
    };

    return response;
  }

  // Fallback for non-WebSocket requests
  return new Response('WebSocket connection required', { 
    status: 400,
    headers: corsHeaders 
  });
});

/**
 * Handle control messages (init, stop, etc.)
 */
async function handleControlMessage(socket: WebSocket, message: any): Promise<void> {
  switch (message.type) {
    case 'init':
      await initializeSession(socket, message);
      break;
    
    case 'stop':
      await stopSession(socket);
      break;
    
    default:
      console.warn('[streaming-stt] Unknown control message type:', message.type);
  }
}

/**
 * Initialize streaming session
 */
async function initializeSession(socket: WebSocket, message: any): Promise<void> {
  try {
    const { chat_id, config } = message;
    
    console.log('[streaming-stt] Initializing session:', { chat_id, config });

    // Create OpenAI client for streaming
    const openaiClient = new (await import('https://esm.sh/openai@4.20.1')).default({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    // Store session
    const session: StreamingSttSession = {
      chat_id,
      config,
      openaiClient,
      isConnected: true
    };
    
    sessions.set(socket.toString(), session);

    // Send confirmation
    socket.send(JSON.stringify({
      type: 'ready',
      message: 'Session initialized'
    }));

  } catch (error) {
    console.error('[streaming-stt] Session initialization failed:', error);
    socket.send(JSON.stringify({
      type: 'error',
      message: 'Failed to initialize session'
    }));
  }
}

/**
 * Handle WebRTC Opus audio data
 */
async function handleAudioData(socket: WebSocket, opusBlob: Blob): Promise<void> {
  try {
    const session = sessions.get(socket.toString());
    if (!session || !session.isConnected) {
      console.warn('[streaming-stt] No active session for audio data');
      return;
    }

    // Decode WebRTC Opus to PCM
    const pcmData = await decodeOpusToPCM(opusBlob, session.config);
    
    // Stream PCM to OpenAI Realtime API
    await streamToOpenAI(session, pcmData);

  } catch (error) {
    console.error('[streaming-stt] Audio processing failed:', error);
    socket.send(JSON.stringify({
      type: 'error',
      message: 'Audio processing failed'
    }));
  }
}

/**
 * Decode WebRTC Opus to PCM using browser's native decoder
 */
async function decodeOpusToPCM(opusBlob: Blob, config: StreamingSttConfig): Promise<Float32Array> {
  try {
    // Convert blob to array buffer
    const arrayBuffer = await opusBlob.arrayBuffer();
    
    // TODO: Implement proper Opus decoding
    // For WebRTC Opus, we need to:
    // 1. Parse WebM container format
    // 2. Extract Opus frames
    // 3. Decode Opus to PCM
    
    // For now, return empty PCM data as placeholder
    // In production, use a proper Opus decoder library
    const frameSize = (config.sampleRate * config.frameSize) / 1000;
    return new Float32Array(frameSize);
    
  } catch (error) {
    console.error('[streaming-stt] Opus decode failed:', error);
    throw error;
  }
}

/**
 * Stream PCM data to OpenAI Realtime API
 */
async function streamToOpenAI(session: StreamingSttSession, pcmData: Float32Array): Promise<void> {
  try {
    // TODO: Implement OpenAI Realtime API streaming
    // This would involve:
    // 1. Converting PCM to base64
    // 2. Sending to OpenAI Realtime API
    // 3. Handling streaming responses
    // 4. Forwarding transcripts back to client
    
    console.log('[streaming-stt] Streaming PCM to OpenAI:', pcmData.length, 'samples');
    
    // Placeholder: simulate transcript response
    if (Math.random() > 0.95) { // 5% chance of transcript
      const transcript = "Hello world";
      const socket = Array.from(sessions.entries()).find(([_, s]) => s === session)?.[0];
      if (socket) {
        // Send transcript back to client
        // socket.send(JSON.stringify({
        //   type: 'transcript',
        //   transcript,
        //   isPartial: true
        // }));
      }
    }

  } catch (error) {
    console.error('[streaming-stt] OpenAI streaming failed:', error);
  }
}

/**
 * Stop session
 */
async function stopSession(socket: WebSocket): Promise<void> {
  const session = sessions.get(socket.toString());
  if (session) {
    session.isConnected = false;
    sessions.delete(socket.toString());
  }
}

/**
 * Cleanup session
 */
function cleanupSession(socket: WebSocket): void {
  sessions.delete(socket.toString());
}
