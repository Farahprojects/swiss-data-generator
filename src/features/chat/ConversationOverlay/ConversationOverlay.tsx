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

// Mic watchdog for self-healing
const lastGoodMicRef = useRef<number>(Date.now());
const watchdogIntervalRef = useRef<number | null>(null);

// Store current TTS audio source for cleanup
const currentTtsSourceRef = useRef<AudioBufferSourceNode | null>(null);

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
      if (status === 'SUBSCRIBED') {
        setConnectionStatus('connected');
      } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
        setConnectionStatus('failed');
      }
    });

    connectionRef.current = connection;
    return true;

  } catch (error) {
    setConnectionStatus('failed');
    return false;
  }
}, [chat_id]);

const closeConnection = useCallback(() => {
  if (connectionRef.current) {
    // Gracefully close WebSocket connection without console noise
    try {
      connectionRef.current.unsubscribe();
    } catch (error) {
      // Silently handle any unsubscribe errors
    }
    connectionRef.current = null;
    setConnectionStatus('disconnected');
  }
}, []);

// TTS playback queue (ordered, single consumer)
type Clip = { 
  id?: string; 
  url?: string; 
  audioBytes?: number[]; // Raw MP3 bytes as number array
  text?: string | null;
  mimeType?: string;
};
const playbackQueue = useRef<Clip[]>([]);
const isPlayingQueue = useRef(false);

// Responsiveness optimizations
const firstClipTimer = useRef<number | null>(null);





// Mic watchdog healing functions
const performHeal = useCallback(() => {
  if (!permissionGranted || conversationState !== 'listening') return;
  
  try {
    // Ensure audio context is running
    conversationMicrophoneService.ensureAudioContext();
    
    // Ensure VAD is monitoring
    conversationMicrophoneService.ensureMonitoring();
    
    // If not recording, try to start
    if (!conversationMicrophoneService.getState().isRecording) {
      conversationMicrophoneService.startRecording().then((success) => {
        if (!success) {
          logDebug('🔄 Watchdog: Failed to restart recording');
        }
      });
    }
  } catch (error) {
    logDebug('🔄 Watchdog heal error:', error);
  }
}, [permissionGranted, conversationState]);

const performDeepHeal = useCallback(() => {
  if (!permissionGranted || conversationState !== 'listening') return;
  
  try {
    // First try normal heal
    conversationMicrophoneService.ensureAudioContext();
    conversationMicrophoneService.ensureMonitoring();
    
    // Nudge the audio track by toggling enabled
    const stream = conversationMicrophoneService.getStream();
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = false;
        setTimeout(() => {
          track.enabled = true;
          logDebug('🔄 Watchdog: Nudged audio track');
        }, 50);
      });
    }
  } catch (error) {
    logDebug('🔄 Watchdog deep heal error:', error);
  }
}, [permissionGranted, conversationState]);

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

// Clear watchdog
if (watchdogIntervalRef.current) {
  clearInterval(watchdogIntervalRef.current);
  watchdogIntervalRef.current = null;
}

// Clear responsiveness timers
if (firstClipTimer.current) {
  clearTimeout(firstClipTimer.current);
  firstClipTimer.current = null;
}





  // Cleanup any remaining TTS resources
  conversationTtsService.stopAllAudio();
}, [isConversationOpen]);

// Mic watchdog effect - start when permission granted and listening
useEffect(() => {
  if (!permissionGranted || conversationState !== 'listening') {
    if (watchdogIntervalRef.current) {
      clearInterval(watchdogIntervalRef.current);
      watchdogIntervalRef.current = null;
    }
    return;
  }

  // Start watchdog
  watchdogIntervalRef.current = window.setInterval(() => {
    const now = Date.now();
    const currentAudioLevel = conversationMicrophoneService.getCurrentAudioLevel();
    
    // Track good mic activity (audio level > threshold)
    if (currentAudioLevel > 0.003) {
      lastGoodMicRef.current = now;
    }
    
    // Heal if needed
    performHeal();
    
    // Deep heal if no good mic activity for 4+ seconds
    if (now - lastGoodMicRef.current > 4000) {
      performDeepHeal();
      lastGoodMicRef.current = now; // Reset to prevent spam
    }
  }, 1500);

  return () => {
    if (watchdogIntervalRef.current) {
      clearInterval(watchdogIntervalRef.current);
      watchdogIntervalRef.current = null;
    }
  };
}, [permissionGranted, conversationState, performHeal, performDeepHeal]);

// Tab focus/visibility healing
useEffect(() => {
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      setTimeout(() => performHeal(), 100); // Small delay after visibility change
    }
  };

  const handleFocus = () => {
    setTimeout(() => performHeal(), 100); // Small delay after focus
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleFocus);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
  };
}, [performHeal]);

// Ensure clean disposal on component unmount while open
useEffect(() => {
return () => {
try {
isShuttingDown.current = true;
conversationTtsService.stopAllAudio();
conversationMicrophoneService.forceCleanup();

// Clear watchdog
if (watchdogIntervalRef.current) {
  clearInterval(watchdogIntervalRef.current);
  watchdogIntervalRef.current = null;
}
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
    await playTtsAudio(next);
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

await new Promise<void>(async (resolve) => {
  if (clip.audioBytes) {
    // SIMPLE SOLUTION: Direct Web Audio API playback from MP3 bytes
    
    console.log('[DEBUG] Playing MP3 directly from', clip.audioBytes.length, 'bytes');
    console.log('[DEBUG] Sample data:', clip.audioBytes.slice(0, 5));
    
    try {
      // Create audio context and decode MP3 bytes directly
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Convert number array to ArrayBuffer for decodeAudioData
      const arrayBuffer = new Uint8Array(clip.audioBytes).buffer;
      
      // Decode the MP3 data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      console.log('[DEBUG] MP3 decoded successfully, duration:', audioBuffer.duration, 'seconds');
      
      // Create and play audio source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Create analyser for speaking animation
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      // Connect: source → analyser → destination
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
      // Store reference to stop audio on modal close
      const audioSourceRef = { current: source };
      
      // Set replying state when audio starts
      setConversationState('replying');
      
      // Simple speaking animation loop that updates the service
      const animateSpeaking = () => {
        if (isShuttingDown.current) return;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const audioLevel = average / 255; // Normalize to 0-1
        
        // Update the conversationTtsService audio level so SpeakingBars can use it
        conversationTtsService.setAudioLevelForAnimation(audioLevel);
        
        if (!isShuttingDown.current) {
          requestAnimationFrame(animateSpeaking);
        }
      };
      
      // Start animation loop
      animateSpeaking();
      
      // Handle completion
      source.onended = () => {
        console.log('[ConversationOverlay] 🎵 Audio playback completed - setting state to listening');
        conversationTtsService.setAudioLevelForAnimation(0);
        setConversationState('listening');
        resolve();
      };
      
      // Start playback
      source.start(0);
      console.log('[ConversationOverlay] 🎵 Audio playback started - setting state to replying');
      setConversationState('replying');
      
      // Store reference for cleanup (will be used in handleModalClose)
      if (!currentTtsSourceRef.current) {
        currentTtsSourceRef.current = source;
      }
      
    } catch (error) {
      console.error('[ConversationOverlay] ❌ Direct audio playback failed:', error);
      setConversationState('listening');
      resolve();
    }
      
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

// Stop current TTS audio source if playing
try {
  if (currentTtsSourceRef.current) {
    currentTtsSourceRef.current.stop();
    currentTtsSourceRef.current = null;
  }
} catch {}

// Try to refresh messages list behind the modal
try {
  const { retryLoadMessages } = useChatStore.getState();
  await retryLoadMessages();
} catch {}

// Reset local state
playbackQueue.current = [];

// Clear watchdog
if (watchdogIntervalRef.current) {
  clearInterval(watchdogIntervalRef.current);
  watchdogIntervalRef.current = null;
}

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