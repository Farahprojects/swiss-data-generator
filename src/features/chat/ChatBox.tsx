import React, { useEffect, useRef, useState } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/core/store';
import { ConversationOverlay } from './ConversationOverlay/ConversationOverlay';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ChatSidebarControls } from './ChatSidebarControls';

export const ChatBox = () => {
  const { error } = useChatStore();
  const ttsProvider = useChatStore((s) => s.ttsProvider);
  const ttsVoice = useChatStore((s) => s.ttsVoice);
  const setTtsProvider = useChatStore((s) => s.setTtsProvider);
  const setTtsVoice = useChatStore((s) => s.setTtsVoice);
  const messages = useChatStore((state) => state.messages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const [isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Observe top sentinel to toggle subtle header shadow only when scrolled
  useEffect(() => {
    const rootEl = scrollRef.current;
    const sentinel = topSentinelRef.current;
    if (!rootEl || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsAtTop(entry.isIntersecting);
      },
      { root: rootEl, threshold: 0.01 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-row flex-1 bg-white max-w-6xl w-full mx-auto md:border-x border-gray-100">
      {/* Left Sidebar (Desktop) */}
      <div className="hidden md:flex w-64 border-r border-gray-100 p-4 flex-col gap-4 bg-gray-50/50">
        <ChatSidebarControls />
      </div>

      {/* Main Chat */}
      <div className="flex flex-col flex-1">
        {/* Mobile Top Bar with Burger */}
        <div className={`md:hidden flex items-center gap-2 p-3 bg-white ${isAtTop ? '' : 'shadow-sm'}`}>
          <Sheet>
            <SheetTrigger asChild>
              <button aria-label="Open menu" className="p-2 rounded-md border border-gray-200 bg-white">
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
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
          {/* Invisible top sentinel to detect scroll position for header shadow */}
          <div ref={topSentinelRef} aria-hidden="true" className="h-0 w-0" />
          <MessageList />
        </div>
        {error && (
          <div className="p-3 text-sm font-medium text-red-700 bg-red-100 border-t border-red-200">{error}</div>
        )}
        <ChatInput />
        <ConversationOverlay />
      </div>
    </div>
  );
};
