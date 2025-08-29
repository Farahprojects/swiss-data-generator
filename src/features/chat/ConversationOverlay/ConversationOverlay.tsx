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

const DEBUG = typeof window !== 'undefined' && (window as any).CONVO_DEBUG === true;
function logDebug(...args: any[]) {
if (DEBUG) console.log('[ConversationOverlay]', ...args);
}

type ConversationState = 'listening' | 'processing' | 'replying' | 'connecting' | 'thinking';

type AudioClipPayload = {
id?: string;
chat_id: string;
role: 'assistant' | 'user';
audio_url?: string | null;
session_id?: string | null;
text?: string | null;
};

export const ConversationOverlay: React.FC = () => {
const { isConversationOpen, closeConversation } = useConversationUIStore();
const chat_id = useChatStore((state) => state.chat_id);
const audioLevel = useConversationAudioLevel();

const [permissionGranted, setPermissionGranted] = useState(false);
const [isStarting, setIsStarting] = useState(false);
const hasStarted = useRef(false);
const isShuttingDown = useRef(false);

const [conversationState, setConversationState] = useState<ConversationState>('listening');
const [isReady, setIsReady] = useState(false);

// Session & chat caching
const chatIdRef = useRef<string | null>(null);
const sessionIdRef = useRef<string>('');

// Local optimistic messages (optional for UI; kept for parity)
const [localMessages, setLocalMessages] = useState<Message[]>([]);

// TTS realtime: cleanup and dedupe tracking
const ttsCleanupRef = useRef<(() => void) | null>(null);
const playedClipIds = useRef<Set<string>>(new Set());

// TTS playback queue (ordered, single consumer)
type Clip = { id?: string; url: string; text?: string | null };
const playbackQueue = useRef<Clip[]>([]);
const isPlayingQueue = useRef(false);

// Initialize session when overlay opens with a valid chat_id
useEffect(() => {
if (!isConversationOpen) return;

if (chat_id && !chatIdRef.current) {
  chatIdRef.current = chat_id;
  sessionIdRef.current = `session_${Date.now()}`;
  setIsReady(true);

  // Attach Realtime listener
  ttsCleanupRef.current = setupTtsListener(chat_id);
  logDebug('Session initialized', { chat_id, sessionId: sessionIdRef.current });
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

// Reset session ID for next open
sessionIdRef.current = '';
playedClipIds.current.clear();
playbackQueue.current = [];
isPlayingQueue.current = false;

// Ensure any listener is removed
if (ttsCleanupRef.current) {
  ttsCleanupRef.current();
  ttsCleanupRef.current = null;
}
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
sessionIdRef.current = '';
setIsReady(false);
playedClipIds.current.clear();
playbackQueue.current = [];
isPlayingQueue.current = false;

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
        newAudioClip.session_id === sessionIdRef.current
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
  // Suspend microphone once for the entire queue playback window
  conversationMicrophoneService.suspendForPlayback();
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
playedClipIds.current.clear();

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
  // Unlock audio synchronously in gesture
  conversationTtsService.unlockAudio();
  conversationTtsService.suspendAudioPlayback();

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

  conversationMicrophoneService.initialize({
    onRecordingComplete: handleSimpleRecordingComplete,
    onSilenceDetected: () => {
      logDebug('Silence detected; stopping recording and pausing mic for TTS');
      setConversationState('thinking');
      conversationMicrophoneService.suspendForPlayback();
      if (conversationMicrophoneService.getState().isRecording) {
        conversationMicrophoneService.stopRecording();
      }
    },
    onError: (error) => {
      console.error('[ConversationOverlay] Microphone error:', error);
      setConversationState('connecting');
    },
    silenceTimeoutMs: 2000,
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
  logDebug('Audio blob too small, returning to listening:', audioBlob?.size || 0);
  setConversationState('listening');
  return;
}

try {
  setConversationState('processing');

  try {
    const chatId = chatIdRef.current!;
    const sessionId = sessionIdRef.current || `session_${Date.now()}`;
    if (!sessionIdRef.current) sessionIdRef.current = sessionId;

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

    // Fire-and-forget; TTS will arrive via realtime listener
    llmService
      .sendMessage({
        chat_id: chatIdRef.current,
        text: transcript,
        client_msg_id,
        mode: 'conversation',
        sessionId: sessionIdRef.current,
      })
      .catch((error) => {
        console.error('[ConversationOverlay] LLM error:', error);
        if (!isShuttingDown.current) setConversationState('listening');
      });
  } catch (sttError) {
    console.error('[ConversationOverlay] STT error:', sttError);
    if (!isShuttingDown.current) setConversationState('listening');
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
<div
         className="text-center text-gray-800 flex flex-col items-center gap-4 cursor-pointer"
         onClick={handleStart}
       >
<div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center transition-colors hover:bg-gray-200">
<Mic className="w-10 h-10 text-gray-600" />
</div>
<h2 className="text-2xl font-light">Tap to Start Conversation</h2>
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
          {state === 'listening'
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