// src/features/chat/ChatInput.tsx
import React, { useState, useRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Mic, AudioLines, ArrowRight, Loader2 } from 'lucide-react';
import { useChatStore } from '@/core/store';
import { chatController } from './ChatController';
import { useConversationUIStore } from './conversation-ui-store';
import { useChatTextMicrophone } from '@/hooks/microphone/useChatTextMicrophone';
import { VoiceWaveform } from './VoiceWaveform';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { useUserConversationsStore } from '@/stores/userConversationsStore';

// Stop icon component
const StopIcon = () => (
  <div className="w-3 h-3 bg-black rounded-sm"></div>
);

export const ChatInput = () => {
  const [text, setText] = useState('');
  const status = useChatStore((state) => state.status);
  const isAssistantTyping = useChatStore((state) => state.isAssistantTyping);
  const setAssistantTyping = useChatStore((state) => state.setAssistantTyping);
  const [isMuted, setIsMuted] = useState(false);
  const { isConversationOpen, openConversation, closeConversation } = useConversationUIStore();
  const chat_id = useChatStore((state) => state.chat_id);
  
  // Auth detection
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('user_id');
  const isAuthenticated = !!user && !!userId;
  
  // Conversation management
  const { addConversation } = useUserConversationsStore();

  // Get report generation state
  const isPolling = useReportReadyStore((state) => state.isPolling);
  const isReportReady = useReportReadyStore((state) => state.isReportReady);

  // Handle transcript ready - add to text area
  const handleTranscriptReady = (transcript: string) => {
    const currentText = text || '';
    const newText = currentText ? `${currentText} ${transcript}` : transcript;
    setText(newText);
  };

  // PROFESSIONAL DOMAIN-SPECIFIC MICROPHONE
  const { 
    isRecording: isMicRecording, 
    isProcessing: isMicProcessing,
    service: microphoneService,
    toggleRecording: toggleMicRecording,
    audioLevelRef
  } = useChatTextMicrophone({
    onTranscriptReady: handleTranscriptReady,
    silenceTimeoutMs: 1200,
    targetFPS: 30, // Mobile-optimized frame rate
    smoothingFactor: 0.8, // Smooth animations
  });

  const handleSend = async () => {
    // 🚫 GUARD: Don't send if conversation overlay is open
    if (isConversationOpen) {
      console.log('[ChatInput] 🔥 BLOCKED: handleSend - conversation mode active');
      return;
    }
    
    // 🚫 ADDITIONAL GUARD: Check if there's an active conversation overlay in DOM
    const conversationOverlay = document.querySelector('[data-conversation-overlay]');
    if (conversationOverlay) {
      console.log('[ChatInput] 🔥 BLOCKED: handleSend - conversation overlay detected in DOM');
      return;
    }

    if (text.trim()) {
      console.log('[ChatInput] 🔥 PROCESSING: handleSend - normal chat mode');
      
      // For authenticated users: create conversation if no chat_id exists
      if (isAuthenticated && !chat_id && user) {
        try {
          console.log('[ChatInput] Creating new conversation for authenticated user');
          const newChatId = await addConversation(user.id, 'New Chat');
          
          // Initialize the conversation in chatController (store will handle state)
          chatController.initializeConversation(newChatId);
          
          console.log('[ChatInput] New conversation created and initialized:', newChatId);
        } catch (error) {
          console.error('[ChatInput] Failed to create conversation:', error);
          return; // Don't send message if conversation creation failed
        }
      }
      
      // Immediately show stop icon when sending message
      setAssistantTyping(true);
      chatController.sendTextMessage(text);
      setText('');
    }
  };

  const handleSpeakerClick = () => {
    if (!isConversationOpen) {
      if (!chat_id) {
        console.error('[ChatInput] Cannot open conversation - no chat_id available');
        return;
      }
      // Opening conversation
      openConversation();
      return;
    }
    if (status === 'recording') {
      return;
    } else {
      chatController.resetConversationService();
      closeConversation();
    }
  };

  const handleRightButtonClick = () => {
    if (isAssistantTyping) {
      // Stop the typing animation
      setAssistantTyping(false);
    } else if (text.trim()) {
      handleSend();
    } else {
      handleSpeakerClick();
    }
  };

  const isRecording = status === 'recording';

  // Determine if assistant is generating content (report generation or text generation)
  const isAssistantGenerating = isPolling || status === 'thinking' || status === 'transcribing' || status === 'speaking';

  // Custom solid black square component
  const SolidBlackSquare = () => (
    <div className="w-3 h-3 bg-black rounded-sm"></div>
  );

  // Determine mic button state and content
  const getMicButtonContent = () => {
    if (isMicProcessing) {
      return <Loader2 size={18} className="animate-spin text-gray-500" />;
    }
    if (isMicRecording) {
      return (
        <div className="w-4 h-4 flex items-center justify-center">
          <div className="w-3 h-0.5 bg-black transform rotate-45 absolute"></div>
          <div className="w-3 h-0.5 bg-black transform -rotate-45 absolute"></div>
        </div>
      );
    }
    return <Mic size={18} className="text-gray-500" />;
  };

  const getMicButtonTitle = () => {
    if (isMicProcessing) {
      return 'Processing audio...';
    }
    if (isMicRecording) {
      return 'Stop recording';
    }
    return 'Start voice recording';
  };

  return (
    <div className="bg-white/80 backdrop-blur-lg border-t border-gray-100 p-2">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          {isMicRecording ? (
            <div className="w-full h-[46px] flex items-center justify-center bg-white border-2 border-gray-300 rounded-3xl">
              <VoiceWaveform audioLevelRef={audioLevelRef} />
            </div>
          ) : (
            <TextareaAutosize
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your thoughts..."
              className="w-full px-4 py-2.5 pr-24 text-base font-light bg-white border-2 border-gray-300 rounded-3xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400 resize-none text-black placeholder-gray-500 overflow-y-auto"
              maxRows={4}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          )}
          <div className="absolute right-1 inset-y-0 flex items-center gap-1" style={{ transform: 'translateY(-4px) translateX(-4px)' }}>
            <button 
              className="w-8 h-8 text-gray-500 hover:text-gray-900 transition-all duration-200 ease-in-out flex items-center justify-center"
              onClick={toggleMicRecording}
              disabled={isMicProcessing}
              title={getMicButtonTitle()}
            >
              {getMicButtonContent()}
            </button>
            <button 
              className={`transition-colors ${
                isAssistantTyping || isAssistantGenerating
                  ? 'w-8 h-8 bg-white border border-black rounded-full text-black flex items-center justify-center' 
                  : text.trim() 
                    ? 'w-8 h-8 bg-white border border-black rounded-full text-black hover:bg-gray-50 flex items-center justify-center' 
                    : 'w-8 h-8 text-gray-500 hover:text-gray-900 flex items-center justify-center'
              }`}
              onClick={handleRightButtonClick}
            >
              {isAssistantTyping ? (
                <StopIcon />
              ) : isAssistantGenerating ? (
                <SolidBlackSquare />
              ) : text.trim() ? (
                <ArrowRight size={16} className="text-black" />
              ) : (
                <AudioLines size={18} className={isRecording ? 'text-red-500' : ''} />
              )}
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto mt-2">
        <p className="text-xs text-gray-400 font-light text-center">
          Therai can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
};
