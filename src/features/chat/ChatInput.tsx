import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChatController } from './ChatController';
import { Send, Mic, Waves } from 'lucide-react';
import { useConversationUIStore } from './conversation-ui-store';
import { useChatTextMicrophone } from '@/hooks/microphone/useChatTextMicrophone';

export const ChatInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { sendTextMessage, status } = useChatController();
  const openConversation = useConversationUIStore((s) => s.openConversation);
  
  const { isRecording, startRecording, stopRecording } = useChatTextMicrophone({
    onTranscriptReady: (text) => {
      setMessage(text);
    },
  });

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSend = async () => {
    if (!message.trim() || status === 'thinking') return;
    
    await sendTextMessage(message.trim());
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const isDisabled = status === 'thinking' || isRecording;
  const showSendButton = message.trim().length > 0;

  return (
    <div className="flex items-end gap-2 p-4 border-t border-border bg-background">
      {/* Voice mode button */}
      <Button
        onClick={openConversation}
        size="sm"
        variant="ghost"
        className="shrink-0 h-11 w-11 p-0 text-gray-500 hover:text-gray-800"
        aria-label="Activate voice mode"
      >
        <Waves className="h-5 w-5" />
      </Button>

      {/* Text area and send button */}
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isRecording ? "Listening..." : "Type your message..."}
          disabled={isDisabled}
          className="min-h-[44px] max-h-32 resize-none pr-12"
          rows={1}
        />
      </div>
      
      {/* Send or Mic button */}
      {showSendButton ? (
        <Button
          onClick={handleSend}
          size="sm"
          disabled={!message.trim() || isDisabled}
          className="shrink-0 h-11 w-11 p-0"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          onClick={handleMicClick}
          size="sm"
          variant={isRecording ? "destructive" : "default"}
          disabled={status === 'thinking'}
          className="shrink-0 h-11 w-11 p-0"
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          <Mic className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};