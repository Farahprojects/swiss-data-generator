import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { VoiceBubble } from './VoiceBubble';
import { useChatStore } from '@/core/store';
import { useConversationAudioLevel } from '@/hooks/useConversationAudioLevel';
import { conversationTtsService } from '@/services/voice/conversationTts';
import { conversationMicrophoneService } from '@/services/microphone/ConversationMicrophoneService';
import { sttService } from '@/services/voice/stt';
import { llmService } from '@/services/llm/chat';
import { chatController } from '@/features/chat/ChatController';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { Message } from '@/core/types';

export const ConversationOverlay: React.FC = () => {
  const { isConversationOpen, closeConversation } = useConversationUIStore();
  const chat_id = useChatStore((state) => state.chat_id);
  const messages = useChatStore((state) => state.messages);
  const audioLevel = useConversationAudioLevel(); // Get real-time audio level
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isStarting, setIsStarting] = useState(false); // Guard against double taps
  const hasStarted = useRef(false); // One-shot guard to prevent double invocation
  const isShuttingDown = useRef(false); // Shutdown guard to prevent processing after modal close

  // Simple conversation state
  const [conversationState, setConversationState] = useState<'listening' | 'processing' | 'replying' | 'connecting' | 'thinking'>('listening');
  const [isReady, setIsReady] = useState(false); // Guard to ensure chat_id is cached before conversation flow
  
  // Cache chat_id and session ID once at start - use for entire conversation
  const chatIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string>(`session_${Date.now()}`);
  
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  
  // Cache chat_id when modal opens - stays for entire conversation
  useEffect(() => {
    if (isConversationOpen && chat_id && !chatIdRef.current) {
      // console.log('[CONVERSATION-TURN] Caching chat_id for conversation:', chat_id);
      chatIdRef.current = chat_id;
      setIsReady(true); // Mark as ready for conversation flow
      
      // Set up minimal realtime listener for TTS audio URLs
      setupTtsListener(chat_id);
    }
  }, [isConversationOpen, chat_id]);
  
  // Minimal realtime listener for TTS audio URLs
  const ttsCleanupRef = useRef<(() => void) | null>(null);
  
  const setupTtsListener = (chat_id: string) => {
    const channel = supabase
      .channel(`conversation-tts:${chat_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_audio_clips',
          filter: `chat_id=eq.${chat_id}`
        },
        (payload) => {
          const newAudioClip = payload.new;
          
          // Check if this is an assistant audio clip for conversation mode
          if (newAudioClip.role === 'assistant' && 
              newAudioClip.audio_url && 
              newAudioClip.session_id === sessionIdRef.current) {
            
            // Play the audio immediately
            playTtsAudio(newAudioClip.audio_url, newAudioClip.text);
          }
        }
      )
      .subscribe();
      
    // Store cleanup function for modal close
    const cleanup = () => {
      supabase.removeChannel(channel);
    };
    ttsCleanupRef.current = cleanup;
    
    return cleanup;
  };
  

  // Play TTS audio through conversationTtsService for proper animation
  const playTtsAudio = async (audioUrl: string, text: string) => {
    try {

      
      // Pause microphone during TTS playback
      conversationMicrophoneService.suspendForPlayback();
      
      // Change UI to speaking
      setConversationState('replying');
      
      // Use conversationTtsService to play audio with proper animation
      await conversationTtsService.playFromUrl(audioUrl, () => {

        // Resume microphone after TTS
        conversationMicrophoneService.resumeAfterPlayback();
        
        // Start recording again for next user input
        conversationMicrophoneService.startRecording().then(success => {
          if (success) {

            setConversationState('listening');
          } else {
            console.error('[CONVERSATION-TURN] Failed to restart microphone after TTS');
            setConversationState('connecting');
          }
        });
      });
      
    } catch (error) {
      console.error('[CONVERSATION-TURN] Audio playback error:', error);
      setConversationState('connecting');
    }
  };
  
  // Clean up when modal closes - RESET ALL FLAGS FOR CLEAN STATE
  useEffect(() => {
    if (!isConversationOpen) {

      
      // Reset component state flags
      chatIdRef.current = null;
      setIsReady(false);
      setPermissionGranted(false);
      setIsStarting(false);
      hasStarted.current = false;
      isShuttingDown.current = false;
      setConversationState('listening');
      setLocalMessages([]);
      
      // Reset session ID for fresh conversation
      sessionIdRef.current = `session_${Date.now()}`;
      

    }
  }, [isConversationOpen]);

  
  // REMOVED: All realtime listeners and TTS flow

  const transformDatabaseMessage = (dbMessage: any): Message => {
    return {
      id: dbMessage.id,
      chat_id: dbMessage.chat_id,
      role: dbMessage.role,
      text: dbMessage.text,
      audioUrl: dbMessage.audio_url,
      timings: dbMessage.timings,
      createdAt: dbMessage.created_at,
      meta: dbMessage.meta,
      client_msg_id: dbMessage.client_msg_id,
      status: dbMessage.status
    };
  };

  // Cleanup on unmount to ensure all resources are released
  useEffect(() => {
    return () => {
      if (isConversationOpen) {
        try {
          isShuttingDown.current = true; // Set shutdown flag
          conversationTtsService.stopAllAudio();
          conversationMicrophoneService.forceCleanup();
          
          // Clear local messages
          setLocalMessages([]);
          
          // Clear cached chat_id and session
          chatIdRef.current = null;
          sessionIdRef.current = `session_${Date.now()}`;
          setIsReady(false);
          
        } catch (error) {
          console.error('[CONVERSATION-TURN] Emergency cleanup error:', error);
        }
      }
    }
  }, [isConversationOpen]);



  // SIMPLE, DIRECT MODAL CLOSE - X button controls everything
  const handleModalClose = async () => {

    isShuttingDown.current = true;
    
    // 🔍 Step 4: Forceful stream teardown on modal close

    try {
      const stream = conversationMicrophoneService.getStream();
      if (stream) {
        stream.getTracks().forEach(track => {

          track.stop();
        });

      }
      // This will ensure all internal recorder/analyser states are cleared
      conversationMicrophoneService.forceCleanup(); 
    } catch (error) {
      console.error("🔴 [CLEANUP] 🎤 Error during microphone cleanup:", error);
    }

    // Stop all audio playback
    conversationTtsService.stopAllAudio();
    
    try {
      const { retryLoadMessages } = useChatStore.getState();
      await retryLoadMessages();
    } catch (error) {}
    
    closeConversation();
    setPermissionGranted(false);
    setIsStarting(false);
    hasStarted.current = false;
    setConversationState('listening');
    chatIdRef.current = null;
    setIsReady(false);
    setLocalMessages([]);
  };

  // Start conversation recording
  const handleStart = async () => {
    if (isStarting || hasStarted.current) return;
    
    // Guard: Ensure chat_id is cached before starting conversation
    if (!isReady || !chatIdRef.current) {
      console.error('[CONVERSATION-TURN] Cannot start conversation - chat_id not ready');
      setIsStarting(false);
      return;
    }
    
    // console.log('[CONVERSATION-TURN] Starting conversation with chat_id:', chatIdRef.current);
    setIsStarting(true);
    hasStarted.current = true;
    
    try {
      // console.log('[CONVERSATION-TURN] Starting...');
      
      // CRITICAL: Unlock audio SYNCHRONOUSLY during user gesture (Safari fix)
      // No await - must be synchronous to preserve gesture context
      conversationTtsService.unlockAudio();
      console.log('[CONVERSATION-TURN] Audio unlock completed, AudioContext state:', conversationTtsService.getMasterAudioElement()?.constructor.name);
      conversationTtsService.suspendAudioPlayback();
      
      
      // Request microphone permission with enhanced error handling
      let stream: MediaStream;
      
      // Generate unique ID for this getUserMedia call
      const requestId = Math.random().toString(36).substring(2, 8);
      const colors = ['🔴', '🟢', '🔵', '🟡', '🟣', '🟠'];
      const color = colors[requestId.charCodeAt(0) % colors.length];
      
      try {
        // 🔍 Step 1: Log browser permission state BEFORE requesting
        if (navigator.permissions?.query) {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log(`${color} [${requestId}] 🔍 Mic permission state BEFORE request:`, permissionStatus.state);
          permissionStatus.onchange = () => {
            console.log(`${color} [${requestId}] 🔍 Mic permission state CHANGED to:`, permissionStatus.state);
          };
        }

        console.log(`${color} [${requestId}] 🎤 STARTING getUserMedia request...`);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
          }
        });
        console.log(`${color} [${requestId}] 🎤 getUserMedia SUCCESS - stream obtained`);

        // 🔍 Step 2: Log detailed stream and track state on success
        console.log(`${color} [${requestId}] 🎤 Mic stream obtained successfully.`, {
          streamId: stream.id,
          isActive: stream.active,
          tracks: stream.getTracks().map(t => ({
            id: t.id,
            kind: t.kind,
            label: t.label,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState,
          })),
        });

      } catch (err) {
        // Enhanced error logging with browser error details
        console.error(`${color} [${requestId}] 🚨 getUserMedia FAILED:`, {
          name: err.name,
          message: err.message,
          error: err
        });
        
        // Handle specific error types gracefully
        if (err.name === 'NotAllowedError') {
          console.error(`${color} [${requestId}] 🚨 Microphone access denied by user`);
        } else if (err.name === 'NotReadableError') {
          console.error(`${color} [${requestId}] 🚨 Microphone is in use by another application`);
        } else if (err.name === 'AbortError') {
          console.error(`${color} [${requestId}] 🚨 Microphone request was aborted (race condition?)`);
        } else if (err.name === 'SecurityError') {
          console.error(`${color} [${requestId}] 🚨 Microphone access blocked by security policy`);
        } else {
          console.error(`${color} [${requestId}] 🚨 Unexpected microphone error:`, err.name, err.message);
        }
        
        setConversationState('connecting');
        return;
      }
      
      setPermissionGranted(true);
      conversationMicrophoneService.cacheStream(stream);
      
      conversationMicrophoneService.initialize({
        onRecordingComplete: handleSimpleRecordingComplete,
        onSilenceDetected: () => {
          console.log('[CONVERSATION-TURN] Silence detected, stopping recording and pausing microphone for TTS.');
          setConversationState('thinking'); // Event-driven UI update
          
          // Pause microphone (don't kill it) so TTS has clean audio path
          conversationMicrophoneService.suspendForPlayback();
          
          if (conversationMicrophoneService.getState().isRecording) {
            conversationMicrophoneService.stopRecording();
          }
        },
        onError: (error) => {
          console.error('[CONVERSATION-TURN] Microphone error:', error);
          setConversationState('connecting');
        },
        silenceTimeoutMs: 2000,
      });
      
      const success = await conversationMicrophoneService.startRecording();
      if (success) {
        
        setConversationState('listening');
      } else {
        console.error('[CONVERSATION-TURN] Failed to start recording.');
        setConversationState('connecting');
      }
      
    } catch (error) {
      console.error('[CONVERSATION-TURN] Startup error:', error);
      setConversationState('connecting');
    } finally {
      setIsStarting(false);
    }
  };

  // Simple conversation flow - nothing can mess with this
  const startSimpleConversation = async () => {
    try {
      // 1. Get microphone permission and start recording
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        } 
      });
      
      // 2. Cache stream for reuse
      conversationMicrophoneService.cacheStream(stream);
      
      // 3. Set up simple callback for when recording completes
      conversationMicrophoneService.initialize({
        onRecordingComplete: handleSimpleRecordingComplete,
        onError: (error) => {
          console.error('[ConversationOverlay] Recording error:', error);
          setConversationState('connecting');
        },
        silenceTimeoutMs: 2000 // 2 seconds - same as mic icon
      });
      
      // 4. Start recording with VAD
      const success = await conversationMicrophoneService.startRecording();
      if (!success) {
        throw new Error('Failed to start recording');
      }
      
      setConversationState('listening');
      
    } catch (error) {
      console.error('[ConversationOverlay] Failed to start conversation:', error);
      setPermissionGranted(false);
      setIsStarting(false);
      hasStarted.current = false;
    }
  };

  // Simple STT processing - using established services
  const handleSimpleRecordingComplete = async (audioBlob: Blob) => {
    // Shutdown guard - don't process if modal is closing
    if (isShuttingDown.current) {
      return;
    }

    // Validate audio blob before processing
    if (!audioBlob || audioBlob.size < 1024) { // Less than 1KB
      console.log('[CONVERSATION-TURN] Audio blob too small, returning to listening:', audioBlob?.size || 0);
      setConversationState('listening');
      return;
    }
    
    try {
      setConversationState('processing');


      // Wrap STT promise with comprehensive error handling
      try {
        const result = await sttService.transcribe(audioBlob, chatIdRef.current!, {}, 'conversation', sessionIdRef.current);
        
        // Shutdown guard - check again after STT
        if (isShuttingDown.current) {
          return;
        }
        
        const transcript = result.transcript;
        
        if (!transcript?.trim()) {
          console.log('[CONVERSATION-TURN] Empty transcript, returning to listening.');
          setConversationState('listening');
          return;
        }
        
        const client_msg_id = uuidv4();
        const optimisticUserMessage: Message = {
          id: client_msg_id,
          chat_id: chatIdRef.current!,
          role: 'user',
          text: transcript,
          createdAt: new Date().toISOString(),
          client_msg_id,
        };
        setLocalMessages(prev => [...prev, optimisticUserMessage]);
        
        // Guard: Ensure chat_id is available before LLM call
        if (!chatIdRef.current) {
          console.error('[CONVERSATION-TURN] Cannot send message - chat_id not available');
          setConversationState('listening');
          return;
        }
        
        // Fire-and-forget LLM call with error handling
        llmService.sendMessage({
          chat_id: chatIdRef.current,
          text: transcript,
          client_msg_id,
          mode: 'conversation',
          sessionId: sessionIdRef.current
        }).catch(error => {
          console.error('[CONVERSATION-TURN] LLM call error:', error);
          if (!isShuttingDown.current) setConversationState('listening');
        });
        
      } catch (sttError) {
        console.error('[CONVERSATION-TURN] STT error:', sttError);
        if (!isShuttingDown.current) setConversationState('listening');
      }
      
    } catch (error) {
      console.error('[CONVERSATION-TURN] Processing error:', error);
      if (!isShuttingDown.current) setConversationState('listening');
    }
  };


  // TEMPORARILY DISABLED: Confirm only Supabase listener triggers TTS
  // useEffect(() => {
  //   if (conversationState === 'processing') {
  //     // After a short delay, set to replying to show TTS is coming
  //     const timer = setTimeout(() => {
  //       if (!isShuttingDown.current) {
  //         setConversationState('replying');
  //         conversationTtsService.resumeAudioPlayback();
  //       }
  //     }, 1000);
  //     
  //     return () => clearTimeout(timer);
  //   }
  // }, [conversationState]);

  // Use simple conversation state
  const state = conversationState;

  if (!isConversationOpen) return null;

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
              {state === 'listening' ? 'Listening…' : 
               state === 'processing' || state === 'thinking' ? 'Thinking…' : 'Speaking…'}
            </p>
            

            
            {/* Close button - positioned under the status text */}
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