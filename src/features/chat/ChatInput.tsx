// src/features/chat/ChatInput.tsx
import React, { useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Mic, AudioLines, ArrowRight } from 'lucide-react';
import { useChatStore } from '@/core/store';
import { chatController } from './ChatController';
import { useConversationUIStore } from './conversation-ui-store';
import { useChatTextMicrophone } from '@/hooks/microphone/useChatTextMicrophone';
import { VoiceWaveform } from './VoiceWaveform';

export const ChatInput = () => {
  const [text, setText] = useState('');
  const status = useChatStore((state) => state.status);
  const [isMuted, setIsMuted] = useState(false);
  const { isConversationOpen, openConversation, closeConversation } = useConversationUIStore();

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
    audioLevel,
    toggleRecording: toggleMicRecording 
  } = useChatTextMicrophone({
    onTranscriptReady: handleTranscriptReady,
    silenceTimeoutMs: 2000
  });

  const handleSend = () => {
    if (text.trim()) {
      chatController.sendTextMessage(text);
      setText('');
    }
  };

  const handleSpeakerClick = () => {
    if (!isConversationOpen) {
      openConversation();
      chatController.startTurn();
      return;
    }
    if (status === 'recording') {
      chatController.endTurn();
    } else {
      // Cancel any active conversation and close
      console.log('[ChatInput] Closing conversation - resetting conversation service');
      chatController.resetConversationService();
      closeConversation();
    }
  };

  const isRecording = status === 'recording';

  return (
    <div className="bg-white/80 backdrop-blur-lg border-t border-gray-100 p-2">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          {isMicRecording ? (
            <div className="w-full h-[46px] flex items-center justify-center bg-white border-2 border-black rounded-3xl">
              <VoiceWaveform audioLevel={audioLevel} />
            </div>
          ) : (
            <TextareaAutosize
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your thoughts..."
              className="w-full px-4 py-2.5 pr-24 text-base font-light bg-white border-2 border-black rounded-3xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-black resize-none text-black placeholder-gray-500 overflow-y-auto"
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
              title={isMicRecording ? 'Stop recording' : 'Start voice recording'}
            >
              <Mic 
                size={18} 
                className={`transition-all duration-200 ease-in-out ${
                  isMicRecording ? 'text-red-500' : 'text-gray-500'
                }`}
              />
            </button>
            <button 
              className={`transition-colors ${
                text.trim() 
                  ? 'w-8 h-8 bg-white border border-black rounded-full text-black hover:bg-gray-50 flex items-center justify-center' 
                  : 'w-8 h-8 text-gray-500 hover:text-gray-900 flex items-center justify-center'
              }`}
              onClick={text.trim() ? handleSend : handleSpeakerClick}
            >
              {text.trim() ? (
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
