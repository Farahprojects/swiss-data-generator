import React from 'react';
import { NewChatButton } from './NewChatButton';
import { ChatMenuButton } from './ChatMenuButton';

export const ChatHeader: React.FC = () => {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
      {/* Sexy New Chat Button */}
      <NewChatButton />

      {/* 3 Dots Menu - now uses the same component as sidebar threads */}
      <ChatMenuButton />
    </div>
  );
};