import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChatController } from './ChatController';
import { Send } from 'lucide-react';

export const ChatInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { sendTextMessage, status } = useChatController();

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

  const isDisabled = status === 'thinking';

  return (
    <div className="flex items-end gap-2 p-4 border-t border-border bg-background">
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={isDisabled}
          className="min-h-[44px] max-h-32 resize-none pr-12"
          rows={1}
        />
      </div>
      
      <Button
        onClick={handleSend}
        size="sm"
        disabled={!message.trim() || isDisabled}
        className="shrink-0 h-11 w-11 p-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
};