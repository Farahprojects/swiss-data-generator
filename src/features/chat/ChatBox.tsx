import React, { useEffect, useRef } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/core/store';
import { ConversationOverlay } from './ConversationOverlay/ConversationOverlay';
import { useState } from 'react';
import { useChatStore } from '@/core/store';

export const ChatBox = () => {
  const { error } = useChatStore();
  const ttsProvider = useChatStore((s) => s.ttsProvider);
  const ttsVoice = useChatStore((s) => s.ttsVoice);
  const setTtsProvider = useChatStore((s) => s.setTtsProvider);
  const setTtsVoice = useChatStore((s) => s.setTtsVoice);
  const messages = useChatStore((state) => state.messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-row flex-1 bg-white max-w-6xl w-full mx-auto border-x border-gray-100">
      {/* Left Sidebar */}
      <div className="hidden md:flex w-64 border-r border-gray-100 p-4 flex-col gap-4 bg-gray-50/50">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">TTS Provider</p>
          <select
            className="w-full border rounded-md px-2 py-2 text-sm bg-white"
            value={ttsProvider}
            onChange={(e) => setTtsProvider(e.target.value as 'google' | 'openai')}
          >
            <option value="google">Google</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Voice</p>
          <select
            className="w-full border rounded-md px-2 py-2 text-sm bg-white"
            value={ttsVoice}
            onChange={(e) => setTtsVoice(e.target.value)}
          >
            {/* Common OpenAI TTS voices; works for Google too as a placeholder mapping */}
            <option value="alloy">Alloy</option>
            <option value="verse">Verse</option>
            <option value="aria">Aria</option>
            <option value="nova">Nova</option>
            <option value="orion">Orion</option>
          </select>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex flex-col flex-1">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
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
