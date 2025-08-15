import React, { useEffect, useRef } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/core/store';
import { ConversationOverlay } from './ConversationOverlay/ConversationOverlay';
import { useMicrophone } from '@/hooks/useMicrophone';
import { useConversationUIStore } from '@/features/chat/conversation-ui-store';
import { useConversationFSM } from './ConversationOverlay/useConversationFSM';

export const ChatBox = () => {
  const { error } = useChatStore();
  const messages = useChatStore((state) => state.messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isConversationOpen = useConversationUIStore((s) => s.isConversationOpen);
  
  // CONVERSATION FLOW - Handles AI chat logic
  const conversationFSM = useConversationFSM();
  
  // CONVERSATION MIC - Owns its own lifecycle, connects to FSM
  const conversationMic = useMicrophone({
    ownerId: 'conversation',
    onTranscriptReady: conversationFSM.handleTranscriptReady,
    silenceTimeoutMs: 3000
  });

  // Start/stop conversation recording based on modal state
  useEffect(() => {
    if (isConversationOpen && conversationFSM.state === 'listening' && !conversationMic.isRecording) {
      console.log('[ChatBox] Conversation opened and FSM ready - starting recording');
      conversationMic.startRecording();
    } else if (!isConversationOpen && conversationMic.isRecording) {
      console.log('[ChatBox] Conversation closed - stopping recording');
      conversationMic.stopRecording();
    }
  }, [isConversationOpen, conversationFSM.state, conversationMic.isRecording, conversationMic.startRecording, conversationMic.stopRecording]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 bg-white max-w-4xl w-full mx-auto border-x border-gray-100">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
        <MessageList />
      </div>
      {error && <div className="p-3 text-sm font-medium text-red-700 bg-red-100 border-t border-red-200">{error}</div>}
      <ChatInput />
      <ConversationOverlay />
    </div>
  );
};
