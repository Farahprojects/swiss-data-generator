/**
 * 🎯 VIRTUALIZED MESSAGE LIST - Performance Optimized Message Display
 * 
 * Uses react-window for efficient rendering of large message lists.
 * Prevents DOM bloat when messages > 200.
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Message } from '@/core/types';
import { useChatStore } from '@/core/store';

interface VirtualizedMessageListProps {
  messages: Message[];
  height: number;
  width: number;
  onScroll?: (scrollOffset: number) => void;
  autoScrollToBottom?: boolean;
}

interface MessageRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    messages: Message[];
    onMessageClick?: (message: Message) => void;
  };
}

const MessageRow: React.FC<MessageRowProps> = React.memo(({ index, style, data }) => {
  const message = data.messages[index];
  
  if (!message) {
    return <div style={style}>Loading...</div>;
  }

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isThinking = message.status === 'thinking';

  return (
    <div style={style} className="px-4 py-2">
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[80%] rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-blue-500 text-white'
              : isThinking
              ? 'bg-gray-200 text-gray-600'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          {isThinking ? (
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm">Thinking...</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words">{message.text}</div>
          )}
        </div>
      </div>
    </div>
  );
});

MessageRow.displayName = 'MessageRow';

export const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  height,
  width,
  onScroll,
  autoScrollToBottom = true
}) => {
  const listRef = useRef<List>(null);
  const scrollToBottomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize the list data to prevent unnecessary re-renders
  const listData = useMemo(() => ({
    messages,
    onMessageClick: (message: Message) => {
      // Handle message click if needed
      console.log('Message clicked:', message.id);
    }
  }), [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScrollToBottom && messages.length > 0 && listRef.current) {
      // Debounce scroll to bottom to avoid excessive scrolling
      if (scrollToBottomTimeoutRef.current) {
        clearTimeout(scrollToBottomTimeoutRef.current);
      }
      
      scrollToBottomTimeoutRef.current = setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollToItem(messages.length - 1, 'end');
        }
      }, 100);
    }

    return () => {
      if (scrollToBottomTimeoutRef.current) {
        clearTimeout(scrollToBottomTimeoutRef.current);
      }
    };
  }, [messages.length, autoScrollToBottom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollToBottomTimeoutRef.current) {
        clearTimeout(scrollToBottomTimeoutRef.current);
      }
    };
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(({ scrollOffset }: { scrollOffset: number }) => {
    onScroll?.(scrollOffset);
  }, [onScroll]);

  // Calculate item size based on message content
  const getItemSize = useCallback((index: number) => {
    const message = messages[index];
    if (!message) return 80; // Default height
    
    const textLength = message.text?.length || 0;
    const baseHeight = 60; // Base height for padding and margins
    const lineHeight = 20; // Approximate line height
    const maxWidth = width * 0.8; // Max width of message bubble
    const charsPerLine = Math.floor(maxWidth / 8); // Approximate chars per line
    const lines = Math.ceil(textLength / charsPerLine);
    
    return Math.max(baseHeight + (lines * lineHeight), 80);
  }, [messages, width]);

  // Performance optimization: only re-render if messages actually changed
  const memoizedMessages = useMemo(() => messages, [messages]);

  if (memoizedMessages.length === 0) {
    return (
      <div 
        style={{ height, width }} 
        className="flex items-center justify-center text-gray-500"
      >
        No messages yet
      </div>
    );
  }

  return (
    <List
      ref={listRef}
      height={height}
      width={width}
      itemCount={memoizedMessages.length}
      itemSize={getItemSize}
      itemData={listData}
      onScroll={handleScroll}
      overscanCount={5} // Render 5 items outside viewport for smooth scrolling
    >
      {MessageRow}
    </List>
  );
};
