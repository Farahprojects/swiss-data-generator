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
import { Message } from '@/core/types';
import { supabase } from '@/integrations/supabase/client';




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
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const chat_id = useChatStore((state) => state.chat_id);
  
  // Debug chat_id - only log when state changes
  useEffect(() => {
    if (DEBUG) {
      console.log('[ConversationOverlay] State change - isConversationOpen:', isConversationOpen, 'chat_id:', chat_id);
    }
  }, [isConversationOpen, chat_id]);
const audioLevel = useConversationAudioLevel();

const [permissionGranted, setPermissionGranted] = useState(false);
const [isStarting, setIsStarting] = useState(false);
const hasStarted = useRef(false);
const isShuttingDown = useRef(false);

const [conversationState, setConversationState] = useState<ConversationState>('listening');
const [isReady, setIsReady] = useState(false);

// No longer needed - using chat_id from store directly

// Local optimistic messages (optional for UI; kept for parity)
const [localMessages, setLocalMessages] = useState<Message[]>([]);

// Telephone-style connection management
const connectionRef = useRef<any>(null);
const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');

// Connection management functions
const establishConnection = useCallback(async () => {
  if (!chat_id) {
    console.error('[ConversationOverlay] No chat_id available for connection');
    return false;
  }

  try {
    setConnectionStatus('connecting');
    console.log('[ConversationOverlay] 📞 Establishing telephone-style connection for chat:', chat_id);

    // Create connection channel
    const connection = supabase.channel(`conversation:${chat_id}`);

    // Listen for TTS ready events
    connection.on('broadcast', { event: 'tts-ready' }, ({ payload }) => {
      console.log('[ConversationOverlay] 🎵 TTS data received via direct connection:', {
        hasAudioBytes: !!payload.audioBytes,
        hasAudioUrl: !!payload.audioUrl,
        size: payload.size
      });
      
      if (payload.audioBytes) {
        // Use raw MP3 bytes for immediate playback
        enqueueTtsClip({ 
          audioBytes: payload.audioBytes, 
          text: payload.text,
          mimeType: payload.mimeType 
        });
      } else if (payload.audioUrl) {
        // Fallback to URL if bytes not available
        enqueueTtsClip({ url: payload.audioUrl, text: payload.text });
      }
    });

    // Handle connection status
    connection.subscribe((status) => {
      console.log('[ConversationOverlay] 📞 Connection status:', status);
      
      if (status === 'SUBSCRIBED') {
        setConnectionStatus('connected');
        console.log('[ConversationOverlay] ✅ Telephone connection established');
      } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
        setConnectionStatus('failed');
        console.error('[ConversationOverlay] ❌ Connection failed:', status);
      }
    });

    connectionRef.current = connection;
    return true;

  } catch (error) {
    console.error('[ConversationOverlay] ❌ Connection establishment failed:', error);
    setConnectionStatus('failed');
    return false;
  }
}, [chat_id]);

const closeConnection = useCallback(() => {
  if (connectionRef.current) {
    console.log('[ConversationOverlay] 📞 Closing telephone connection');
    connectionRef.current.unsubscribe();
    connectionRef.current = null;
    setConnectionStatus('disconnected');
  }
}, []);

// TTS playback queue (ordered, single consumer)
type Clip = { 
  id?: string; 
  url?: string; 
  audioBytes?: string; // Base64 encoded MP3 bytes
  text?: string | null;
  mimeType?: string;
};
const playbackQueue = useRef<Clip[]>([]);
const isPlayingQueue = useRef(false);

// Responsiveness optimizations
const firstClipTimer = useRef<number | null>(null);





// Initialize when overlay opens
useEffect(() => {
if (isConversationOpen && chat_id) {
  setIsReady(true);
}

return () => {
  // Cleanup connection on unmount
  closeConnection();
};
}, [isConversationOpen, chat_id]);

// When overlay closes, hard reset local state
useEffect(() => {
if (isConversationOpen) return;

// Reset component state flags
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





  // Cleanup any remaining TTS resources
  conversationTtsService.stopAllAudio();
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
setIsReady(false);


  }
};
}, []);



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
  // Defensively suspend mic if still recording when assistant starts talking
  if (conversationMicrophoneService.getState().isRecording) {
    conversationMicrophoneService.suspendForPlayback();
  }

  while (playbackQueue.current.length > 0 && !isShuttingDown.current) {
    const next = playbackQueue.current.shift()!;
    console.log('DEBUG: starting clip', next);
    await playTtsAudio(next);
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

async function playTtsAudio(clip: Clip) {
if (isShuttingDown.current) return;

await new Promise<void>((resolve) => {
  if (clip.audioBytes) {
    // Use raw MP3 bytes for immediate playback
    console.log('[ConversationOverlay] 🎵 Playing from raw MP3 bytes, size:', clip.audioBytes.length);
    
    // Decode base64 to ArrayBuffer
    const binaryString = atob(clip.audioBytes);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create blob URL for immediate playback
    const blob = new Blob([bytes], { type: clip.mimeType || 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(blob);
    
    conversationTtsService
      .playFromUrl(audioUrl, () => {
        URL.revokeObjectURL(audioUrl); // Clean up blob URL
        resolve();
      }, () => {
        // onStart: Set replying state when audio actually starts playing
        setConversationState('replying');
      })
      .catch(() => {
        URL.revokeObjectURL(audioUrl); // Clean up on error
        resolve();
      });
      
  } else if (clip.url) {
    // Fallback to URL playback
    console.log('[ConversationOverlay] 🎵 Playing from URL:', clip.url);
    
    conversationTtsService
      .playFromUrl(clip.url, () => resolve(), () => {
        // onStart: Set replying state when audio actually starts playing
        setConversationState('replying');
      })
      .catch(() => resolve()); // don't block queue on errors
  } else {
    console.error('[ConversationOverlay] ❌ No audio data available in clip');
    resolve();
  }
});
}



const handleModalClose = useCallback(async () => {
isShuttingDown.current = true;

// Close telephone connection
closeConnection();

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
setIsReady(false);
setLocalMessages([]);
}, [closeConversation]);

const handleStart = useCallback(async () => {
if (isStarting || hasStarted.current) return;

if (!isReady || !chat_id) {
  console.error('[ConversationOverlay] Cannot start - chat_id not ready');
  return;
}

if (!chat_id) {
  console.error('[ConversationOverlay] Cannot start - no chat_id available');
  return;
}

setIsStarting(true);
hasStarted.current = true;

try {
  // Step 1: Set establishing state for telephone connection
  setConversationState('establishing');
  
  // Step 2: Establish telephone-style connection
  const connectionSuccess = await establishConnection();
  if (!connectionSuccess) {
    console.error('[ConversationOverlay] Failed to establish telephone connection');
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
  
  // WebSocket connection established
  
  // Step 4: TTS is now handled directly via HTTP response (no WebSocket needed)
  
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

  // Processing recording
  
  if (!chat_id) {
    console.error('[ConversationOverlay] No chat_id available - cannot process recording');
    setConversationState('listening');
    return;
  }

  const result = await sttService.transcribe(audioBlob, chat_id, {}, 'conversation', chat_id);

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
    chat_id: chat_id,
    role: 'user',
    text: transcript,
    createdAt: new Date().toISOString(),
    client_msg_id,
  };
  setLocalMessages((prev) => [...prev, optimisticUserMessage]);

  // Get the response from LLM with audioUrl
  const response = await llmService.sendMessage({
      chat_id: chat_id,
      text: transcript,
      client_msg_id,
      mode: 'conversation',
  });

  if (isShuttingDown.current) return;

  if (response.text) {
    setConversationState('replying');
    
    // Wait for TTS audio via telephone connection only
    console.log('[ConversationOverlay] LLM response received, waiting for TTS audio via telephone connection...');
  }

} catch (error) {
  console.error('[ConversationOverlay] Processing error:', error);
  if (!isShuttingDown.current) setConversationState('listening');
}
}, [chat_id]);

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