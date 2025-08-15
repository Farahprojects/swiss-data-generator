import { useState, useEffect } from 'react';
import { llmService } from '@/services/llm/chat';
import { ttsService } from '@/services/voice/tts';
import { audioPlayer } from '@/services/voice/audioPlayer';
import { useChatStore } from '@/core/store';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { useSpeechToText } from '@/hooks/useSpeechToText';

export type ConversationState = 'listening' | 'processing' | 'replying';

export const useConversationFSM = () => {
  const [state, setState] = useState<ConversationState>('listening');
  const conversationId = useChatStore((s) => s.conversationId)!;
  const addMessage = useChatStore((s) => s.addMessage);
  const isConversationOpen = useConversationUIStore((s) => s.isConversationOpen);

  // Handle transcript ready - process AI response
  const handleTranscriptReady = async (transcript: string) => {
    if (!isConversationOpen) return;
    
    console.log('[ConversationFSM] Transcript ready:', transcript);
    
    // Handle empty transcript - just continue listening
    if (!transcript || transcript.trim().length === 0) {
      console.log('[ConversationFSM] Empty transcript received - continuing to listen');
      setState('listening');
      // Start recording again immediately for next attempt
      setTimeout(() => {
        if (useConversationUIStore.getState().isConversationOpen && !speechToText.isRecording) {
          console.log('[ConversationFSM] Restarting recording after empty transcript');
          speechToText.startRecording();
        }
      }, 500);
      return;
    }
    
    console.log('[ConversationFSM] Processing AI response for transcript:', transcript);
    setState('processing');

    try {
      // Add user message (text only - no audio storage)
      console.log('[ConversationFSM] Adding user message to store (text-only)...');
      addMessage({ 
        id: crypto.randomUUID(), 
        conversationId, 
        role: 'user', 
        text: transcript, 
        createdAt: new Date().toISOString()
        // Note: No audioUrl - we only persist text
      });
      
      // Get AI response
      console.log('[ConversationFSM] Calling LLM service...');
      const assistantMsg = await llmService.chat({ conversationId, userMessage: { text: transcript } });
      console.log('[ConversationFSM] LLM response received:', assistantMsg.text?.substring(0, 50) + '...');
      
      // Add assistant message (text only - no audio URL stored)
      console.log('[ConversationFSM] Adding assistant message to store (text-only)...');
      addMessage({
        ...assistantMsg,
        // Explicitly remove audioUrl if present - we only persist text
        audioUrl: undefined
      });
      
      // Generate and play TTS (live audio, not stored)
      console.log('[ConversationFSM] Transitioning to replying state');
      setState('replying');
      
      console.log('[ConversationFSM] Starting TTS conversion (live audio)...');
      const audioUrl = await ttsService.speak(assistantMsg.id, assistantMsg.text);
      console.log('[ConversationFSM] TTS data URL received for immediate playback');
      
      console.log('[ConversationFSM] Starting live audio playback (no storage)...');
      audioPlayer.play(audioUrl, () => {
        console.log('[ConversationFSM] 🔊 AI finished speaking - audio.onended triggered');
        
        if (!useConversationUIStore.getState().isConversationOpen) {
          console.log('[ConversationFSM] Overlay closed during playback - not restarting');
          return;
        }
        
        // Add 300ms debounce to prevent mic picking up tail end of TTS
        console.log('[ConversationFSM] Adding 300ms debounce before restarting listening...');
        setTimeout(() => {
          if (useConversationUIStore.getState().isConversationOpen) {
            console.log('[ConversationFSM] 🎤 Restarting listening mode after AI speech ended');
            setState('listening');
            // Note: useEffect will handle starting recording when state changes to 'listening'
          } else {
            console.log('[ConversationFSM] Conversation closed during debounce period');
          }
        }, 300); // 300ms debounce as recommended
      });
      
    } catch (err) {
      console.error('[ConversationFSM] Error in conversation flow:', err);
      
      // Return to listening with delay on error
      setTimeout(() => {
        if (useConversationUIStore.getState().isConversationOpen) {
          console.log('[ConversationFSM] Error recovery - returning to listening');
          setState('listening');
        }
      }, 2000);
    }
  };

  // Handle silence detected - just log it (useSpeechToText handles the auto-stop)
  const handleSilenceDetected = () => {
    console.log('[ConversationFSM] Silence detected, processing will start automatically');
  };

  // Use the proven mic button STT logic
  const speechToText = useSpeechToText(handleTranscriptReady, handleSilenceDetected);

  // Start recording when conversation opens and in listening state
  useEffect(() => {
    console.log('[ConversationFSM] useEffect triggered - state:', state, 'isOpen:', isConversationOpen, 'isRecording:', speechToText.isRecording, 'isProcessing:', speechToText.isProcessing);
    
    if (state === 'listening' && isConversationOpen && !speechToText.isRecording && !speechToText.isProcessing) {
      console.log('[ConversationFSM] ✅ All conditions met - starting recording for listening state');
      speechToText.startRecording();
    } else {
      console.log('[ConversationFSM] ❌ Conditions not met for starting recording:', {
        stateIsListening: state === 'listening',
        conversationOpen: isConversationOpen,
        notRecording: !speechToText.isRecording,
        notProcessing: !speechToText.isProcessing
      });
    }
  }, [state, isConversationOpen, speechToText.isRecording, speechToText.isProcessing]);

  // IMMEDIATE CLEANUP when conversation closes - stop EVERYTHING
  useEffect(() => {
    if (!isConversationOpen) {
      console.log('[ConversationFSM] 🚨 CONVERSATION CLOSED - EMERGENCY SHUTDOWN');
      
      // 1. STOP RECORDING IMMEDIATELY (highest priority) - EMERGENCY STOP
      console.log('[ConversationFSM] 🎤 EMERGENCY STOP RECORDING - KILL BROWSER MIC');
      speechToText.emergencyStop(); // Use emergency stop instead of regular stop
      
      // 2. STOP AUDIO PLAYBACK IMMEDIATELY  
      console.log('[ConversationFSM] 🔊 STOPPING AUDIO PLAYBACK IMMEDIATELY');
      audioPlayer.stop(); // Use stop() instead of pause() for complete shutdown
      
      // 3. Reset state to prevent any pending operations
      console.log('[ConversationFSM] 🔄 RESETTING STATE');
      setState('listening');
      
      console.log('[ConversationFSM] ✅ EMERGENCY SHUTDOWN COMPLETE');
    }
  }, [isConversationOpen]);

  return { 
    state,
    isRecording: speechToText.isRecording,
    isProcessing: speechToText.isProcessing,
    audioLevel: speechToText.audioLevel
  };
};
