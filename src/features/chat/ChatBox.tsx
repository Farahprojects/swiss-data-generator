import React, { useEffect, useRef } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/core/store';
import { ConversationOverlay } from './ConversationOverlay/ConversationOverlay';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ChatSidebarControls } from './ChatSidebarControls';

export const ChatBox = () => {
  const { error } = useChatStore();
  const messages = useChatStore((state) => state.messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the bottom of the message list when new messages are added
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-row flex-1 bg-white max-w-6xl w-full mx-auto md:border-x border-gray-100 min-h-0">
      {/* Left Sidebar (Desktop) */}
      <div className="hidden md:flex w-64 border-r border-gray-100 p-4 flex-col gap-4 bg-gray-50/50">
        <ChatSidebarControls />
      </div>

      {/* Main Chat Area: A flex column that fills the remaining space */}
      <div className="flex flex-col flex-1 w-full min-w-0">
        {/* Mobile Header (Static, takes its own space) */}
        <div className="md:hidden flex items-center gap-2 p-3 bg-white border-b border-gray-100 pt-safe">
          <Sheet>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className="p-2 rounded-md border border-gray-200 bg-white"
              >
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85%] sm:max-w-xs p-4">
              <div className="mb-3">
                <h2 className="text-lg font-light italic">Settings</h2>
              </div>
              <ChatSidebarControls />
            </SheetContent>
          </Sheet>
          <div className="flex-1" />
        </div>


        {/* Message List (This is the scrolling content area) */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
          <MessageList />
        </div>

        {/* Footer Area (Static, contains error and input) */}
        <div className="pb-safe">
          {error && (
            <div className="p-3 text-sm font-medium text-red-700 bg-red-100 border-t border-red-200">
              {error}
            </div>
          )}
          <div className="border-t border-gray-100">
            <ChatInput />
          </div>
        </div>

        {/* Conversation Overlay (fixed position, does not affect layout) */}
        <ConversationOverlay />
      </div>
    </div>
  );
};
