import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { VoiceBubble } from './VoiceBubble';
import { useChatStore } from '@/core/store';
import { useConversationAudioLevel } from '@/hooks/useConversationAudioLevel';
import { conversationTtsService } from '@/services/voice/conversationTts';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/core/types';
import { StreamPlayerService } from '@/services/voice/StreamPlayerService';
import { webSocketTtsService } from '@/services/voice/WebSocketTtsService';
import { tempAudioService } from '@/services/voice/TempAudioService';


const DEBUG = typeof window !== 'undefined' && (window as any).CONVO_DEBUG === true;
function logDebug(...args: any[]) {
if (DEBUG) console.log('[ConversationOverlay]', ...args);
}

type ConversationState = 'listening' | 'processing' | 'replying' | 'connecting' | 'thinking' | 'establishing';

type AudioClipPayload = {
id?: string;
chat_id: string;
role: 'assistant' | 'user';
audio_url?: string | null;
session_id?: string | null;
text?: string | null;
};

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation, sessionId } = useConversationUIStore();
const chat_id = useChatStore((state) => state.chat_id);
const audioLevel = useConversationAudioLevel();

const [permissionGranted, setPermissionGranted] = useState(false);
const [isStarting, setIsStarting] = useState(false);
const hasStarted = useRef(false);
const isShuttingDown = useRef(false);

const [conversationState, setConversationState] = useState<ConversationState>('listening');
const [isReady, setIsReady] = useState(false);

// Chat caching
const chatIdRef = useRef<string | null>(null);

// Local optimistic messages (optional for UI; kept for parity)
const [localMessages, setLocalMessages] = useState<Message[]>([]);

// TTS realtime: cleanup and dedupe tracking
const ttsCleanupRef = useRef<(() => void) | null>(null);
const playedClipIds = useRef<Set<string>>(new Set());

// TTS playback queue (ordered, single consumer)
type Clip = { id?: string; url: string; text?: string | null };
const playbackQueue = useRef<Clip[]>([]);
const isPlayingQueue = useRef(false);

// Responsiveness optimizations
const firstClipTimer = useRef<number | null>(null);

const streamPlayerRef = useRef<StreamPlayerService | null>(null);
const streamListenerCleanupRef = useRef<(() => void) | null>(null);

// This effect now only handles cleanup on unmount
useEffect(() => {
  return () => {
    if (streamPlayerRef.current) {
      streamPlayerRef.current.cleanup();
      streamPlayerRef.current = null;
    }
  };
}, []);

// Initialize when overlay opens
useEffect(() => {
if (isConversationOpen && chat_id) {
  if (!chatIdRef.current) {
    chatIdRef.current = chat_id;
    setIsReady(true);
  }
}

return () => {
  // On unmount or route change while open
  if (ttsCleanupRef.current) {
    ttsCleanupRef.current();
    ttsCleanupRef.current = null;
  }
};
}, [isConversationOpen, chat_id]);

// When overlay closes, hard reset local state
useEffect(() => {
if (isConversationOpen) return;

// Reset component state flags
chatIdRef.current = null;
setIsReady(false);
setPermissionGranted(false);
setIsStarting(false);
hasStarted.current = false;
isShuttingDown.current = false;
setConversationState('listening');
setLocalMessages([]);

// Session ID is managed by the store now

// Clear responsiveness timers
if (firstClipTimer.current) {
  clearTimeout(firstClipTimer.current);
  firstClipTimer.current = null;
}

// Clear played clip IDs
playedClipIds.current.clear();

// Ensure any listener is removed
if (ttsCleanupRef.current) {
  ttsCleanupRef.current();
  ttsCleanupRef.current = null;
}

// Cleanup WebSocket TTS
webSocketTtsService.cleanup();

// Cleanup temp audio service
tempAudioService.unsubscribe();
}, [isConversationOpen]);

// Ensure clean disposal on component unmount while open
useEffect(() => {
return () => {
try {
isShuttingDown.current = true;
conversationTtsService.stopAllAudio();
conversationMicrophoneService.forceCleanup();
} catch (error) {
console.error('[ConversationOverlay] Emergency cleanup error:', error);
} finally {
// State resets
setLocalMessages([]);
chatIdRef.current = null;
setIsReady(false);

    if (ttsCleanupRef.current) {
      ttsCleanupRef.current();
      ttsCleanupRef.current = null;
    }
  }
};
}, []);

const setupTtsListener = (cid: string) => {
// Defensive: remove previous channel if any
if (ttsCleanupRef.current) {
ttsCleanupRef.current();
ttsCleanupRef.current = null;
}

const channel = supabase
  .channel(`conversation-tts:${cid}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_audio_clips',
      filter: `chat_id=eq.${cid}`,
    },
    (payload: { new: AudioClipPayload }) => {
      const newAudioClip = payload?.new;
      if (!newAudioClip) return;

      // Filter to this session and assistant role with valid URL
      if (
        newAudioClip.role === 'assistant' &&
        newAudioClip.audio_url &&
        newAudioClip.session_id === sessionId
      ) {
        // Deduplicate by row id if available
        const clipId = newAudioClip.id || `${newAudioClip.audio_url}-${newAudioClip.text || ''}`;
        if (playedClipIds.current.has(clipId)) {
          logDebug('Duplicate clip ignored', clipId);
          return;
        }
        playedClipIds.current.add(clipId);

        enqueueTtsClip({ id: clipId, url: newAudioClip.audio_url, text: newAudioClip.text });
      }
    }
  )
  .subscribe((status) => {
    logDebug('Realtime channel status:', status);
  });

const cleanup = () => {
  try {
    supabase.removeChannel(channel);
  } catch {}
};

return cleanup;
};

function enqueueTtsClip(clip: Clip) {
// mark that a clip has arrived; cancel "replying" watchdog
if (firstClipTimer.current) {
  clearTimeout(firstClipTimer.current);
  firstClipTimer.current = null;
}
playbackQueue.current.push(clip);
maybeStartPlaybackQueue();
}

async function maybeStartPlaybackQueue() {
if (isPlayingQueue.current) return;
if (playbackQueue.current.length === 0) return;
if (isShuttingDown.current) {
// Flush queue if shutting down
playbackQueue.current = [];
return;
}

isPlayingQueue.current = true;

try {
  // Mic already suspended on silenceDetected; no need to suspend again
  setConversationState('replying');

  while (playbackQueue.current.length > 0 && !isShuttingDown.current) {
    const next = playbackQueue.current.shift()!;
    console.log('DEBUG: starting clip', next);
    await playTtsAudio(next.url, next.text || undefined);
    console.log('DEBUG: finished clip', next);
  }
} catch (err) {
  console.error('[ConversationOverlay] Queue playback error:', err);
  // Fall through to resume mic
} finally {
  // Resume microphone after the queue drains or on error
  try {
    if (!isShuttingDown.current) {
      conversationMicrophoneService.resumeAfterPlayback();
      const ok = await conversationMicrophoneService.startRecording();
      if (ok) {
        setConversationState('listening');
      } else {
        setConversationState('connecting');
      }
    }
  } catch (e) {
    console.error('[ConversationOverlay] Error restarting mic after TTS:', e);
    if (!isShuttingDown.current) setConversationState('connecting');
  }
  isPlayingQueue.current = false;
}
}

async function playTtsAudio(audioUrl: string, _text?: string) {
if (isShuttingDown.current) return;
await new Promise<void>((resolve) => {
// Resolve only when TTS finishes
conversationTtsService
  .playFromUrl(audioUrl, () => resolve())
  .catch(() => resolve()); // don't block queue on errors
});
}

const setupStreamListener = (sessionId: string) => {
  // Clean up previous listener if any
  if (streamListenerCleanupRef.current) {
    streamListenerCleanupRef.current();
  }

  const channel = supabase.channel(`tts-stream:${sessionId}`);

  channel.on("broadcast", { event: "audio-chunk" }, ({ payload }) => {
    if (isShuttingDown.current || !streamPlayerRef.current) return;
    
    // The player already exists and is primed, just append chunks
    streamPlayerRef.current.appendChunk(payload.chunk);
  });

  channel.on("broadcast", { event: "audio-stream-end" }, () => {
    if (isShuttingDown.current) return;
    if (streamPlayerRef.current) {
      streamPlayerRef.current.endStream();
    }
  });

  channel.subscribe((status) => {
    // Detailed logging for WebSocket connection status
    console.log(`[WebSocket] Subscription status: ${status}`);
    if (status === 'SUBSCRIBED') {
      console.log(`[WebSocket] ✅ Successfully subscribed to TTS stream channel: tts-stream:${sessionId}`);
    } else if (status === 'TIMED_OUT') {
      console.error(`[WebSocket] ❌ Timed out subscribing to channel: tts-stream:${sessionId}`);
    } else if (status === 'CHANNEL_ERROR') {
      console.error(`[WebSocket] ❌ Channel error on: tts-stream:${sessionId}`);
    }
  });

  const cleanup = () => {
    supabase.removeChannel(channel);
  };
  streamListenerCleanupRef.current = cleanup;
};

const handleModalClose = useCallback(async () => {
isShuttingDown.current = true;

// Stop mic nicely
try {
  const stream = conversationMicrophoneService.getStream();
  if (stream) {
    stream.getTracks().forEach((t) => {
      try { t.stop(); } catch {}
    });
  }
  conversationMicrophoneService.forceCleanup();
} catch (error) {
  console.error('[ConversationOverlay] Microphone cleanup error:', error);
}

// Stop TTS playback and clear queue
try {
  conversationTtsService.stopAllAudio();
} catch {}

// Try to refresh messages list behind the modal
try {
  const { retryLoadMessages } = useChatStore.getState();
  await retryLoadMessages();
} catch {}

// Reset local state
playbackQueue.current = [];

// Clear responsiveness timers
if (firstClipTimer.current) {
  clearTimeout(firstClipTimer.current);
  firstClipTimer.current = null;
}

closeConversation();
setPermissionGranted(false);
setIsStarting(false);
hasStarted.current = false;
setConversationState('listening');
chatIdRef.current = null;
setIsReady(false);
setLocalMessages([]);
}, [closeConversation]);

const handleStart = useCallback(async () => {
if (isStarting || hasStarted.current) return;

if (!isReady || !chatIdRef.current) {
  console.error('[ConversationOverlay] Cannot start - chat_id not ready');
  return;
}

setIsStarting(true);
hasStarted.current = true;

try {
  // Step 1: Set establishing state for WebSocket connection
  setConversationState('establishing');
  
  // Step 2: Establish WebSocket connection first
  console.log('[ConversationOverlay] Establishing WebSocket connection for session:', sessionId);
  
  if (!sessionId) {
    console.error('[ConversationOverlay] No session ID available for WebSocket connection');
    setConversationState('connecting');
    return;
  }
  
  const connectionSuccess = await webSocketTtsService.initializeConnection(sessionId);
  if (!connectionSuccess) {
    console.error('[ConversationOverlay] Failed to establish WebSocket connection');
    setConversationState('connecting');
    return;
  }
  
  // Step 3: Play connection success click sound
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Click sound: very short, sharp burst
    oscillator.frequency.setValueAtTime(1500, audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.02);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.02); // Very short click
  } catch (soundError) {
    console.warn('[ConversationOverlay] Could not play connection sound:', soundError);
  }
  
  console.log('[ConversationOverlay] ✅ WebSocket connection established successfully');
  
  // Step 4: Subscribe to temp_audio table for TTS updates
  tempAudioService.subscribeToSession(sessionId);
  
  // Step 5: Unlock audio synchronously in gesture
  conversationTtsService.unlockAudio();

  // Begin getUserMedia promptly to retain gesture context on Safari
  let stream: MediaStream;
  try {
    const gumPromise = navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
      },
    });

    // Optional: observe permission changes without blocking
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((ps) => {
          ps.onchange = () => logDebug('Mic permission changed:', ps.state);
        })
        .catch(() => {});
    }

    stream = await gumPromise;
  } catch (err: any) {
    console.error('[ConversationOverlay] getUserMedia failed:', err?.name, err?.message);
    setConversationState('connecting');
    return;
  }

  setPermissionGranted(true);
  conversationMicrophoneService.cacheStream(stream);

  // PRIME THE PLAYER: Create the player and call play() within the user gesture
  if (!streamPlayerRef.current) {
    console.log('[Gesture] Priming audio stream player...');
    streamPlayerRef.current = new StreamPlayerService(() => {
      // onPlaybackEnd callback
      if (!isShuttingDown.current) {
          conversationMicrophoneService.resumeAfterPlayback();
          conversationMicrophoneService.startRecording().then(ok => {
              setConversationState(ok ? 'listening' : 'connecting');
          });
      }
    });
    streamPlayerRef.current.play(); // This is the critical priming step
  }
  
  // The listener will now be set up in handleSimpleRecordingComplete

  conversationMicrophoneService.initialize({
    onRecordingComplete: handleSimpleRecordingComplete,
    onSilenceDetected: () => {
      logDebug('Silence detected; stopping recording for processing.');
      setConversationState('processing'); // User has finished speaking
      conversationMicrophoneService.suspendForPlayback();
      if (conversationMicrophoneService.getState().isRecording) {
        conversationMicrophoneService.stopRecording();
      }
    },
    onError: (error) => {
      console.error('[ConversationOverlay] Microphone error:', error);
      setConversationState('connecting');
    },
    silenceTimeoutMs: 1200,
  });

  const success = await conversationMicrophoneService.startRecording();
  setConversationState(success ? 'listening' : 'connecting');
} catch (error) {
  console.error('[ConversationOverlay] Startup error:', error);
  setConversationState('connecting');
} finally {
  setIsStarting(false);
}
}, [isStarting, isReady]);

const handleSimpleRecordingComplete = useCallback(async (audioBlob: Blob) => {
if (isShuttingDown.current) return;

if (!audioBlob || audioBlob.size < 1024) {
  logDebug('Audio blob too small, returning to listening');
  setConversationState('listening');
  return;
}

// Removed TTS listener setup for now - just focus on start flow

// Set state to replying immediately after we have a valid recording
setConversationState('replying');

try {
  setConversationState('processing');

  const chatId = chatIdRef.current!;
  
  if (!sessionId) {
    console.error('[ConversationOverlay] No session ID available - cannot process recording');
    setConversationState('listening');
    return;
  }

  const result = await sttService.transcribe(audioBlob, chatId, {}, 'conversation', sessionId);

  if (isShuttingDown.current) return;

  const transcript = result.transcript;
  if (!transcript?.trim()) {
    logDebug('Empty transcript, back to listening');
    setConversationState('listening');
    return;
  }

  const client_msg_id = uuidv4();
  const optimisticUserMessage: Message = {
    id: client_msg_id,
    chat_id: chatId,
    role: 'user',
    text: transcript,
    createdAt: new Date().toISOString(),
    client_msg_id,
  };
  setLocalMessages((prev) => [...prev, optimisticUserMessage]);

  if (!chatIdRef.current) {
    console.error('[ConversationOverlay] Cannot send message - chat_id missing');
    setConversationState('listening');
    return;
  }

  // First get the response from LLM
  const response = await llmService.sendMessage({
      chat_id: chatIdRef.current!,
      text: transcript,
      client_msg_id,
      mode: 'conversation',
      sessionId: sessionId,
  });

  if (isShuttingDown.current) return;

  // LLM handler now automatically triggers TTS - just wait for audio stream
  if (response.text) {
    setConversationState('replying');
    
    // The LLM handler has already triggered TTS via HTTP POST to openai-tts-ws
    // The frontend WebSocket should receive the audio stream automatically
    console.log('[ConversationOverlay] LLM response received, waiting for TTS audio stream...');
  }

} catch (error) {
  console.error('[ConversationOverlay] Processing error:', error);
  if (!isShuttingDown.current) setConversationState('listening');
}
}, []);

const state = conversationState;

// SSR guard
const canPortal = typeof document !== 'undefined' && !!document.body;
if (!isConversationOpen || !canPortal) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-white pt-safe pb-safe">
<div className="h-full w-full flex items-center justify-center px-6">
{!permissionGranted ? (
<div className="text-center text-gray-800 flex flex-col items-center gap-4">
<div
         className="cursor-pointer flex flex-col items-center gap-4"
         onClick={handleStart}
       >
<div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center transition-colors hover:bg-gray-200">
<Mic className="w-10 h-10 text-gray-600" />
</div>
<h2 className="text-2xl font-light">Tap to Start Conversation</h2>
</div>
<button
          onClick={closeConversation}
          aria-label="Close conversation"
          className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition-colors"
        >
          ✕
        </button>
</div>
) : (
<div className="flex flex-col items-center justify-center gap-6 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={state}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              <VoiceBubble state={state} audioLevel={audioLevel} />
            </motion.div>
          </AnimatePresence>

          <p className="text-gray-500 font-light">
          {state === 'establishing'
            ? 'Establishing connection…'
            : state === 'listening'
            ? 'Listening…'
            : state === 'processing' || state === 'thinking'
            ? 'Thinking…'
            : 'Speaking…'}
        </p>

        <button
          onClick={handleModalClose}
          aria-label="Close conversation"
          className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition-colors"
        >
          ✕
        </button>
        </div>
    )}
      </div>
    </div>,
    document.body
  );
};