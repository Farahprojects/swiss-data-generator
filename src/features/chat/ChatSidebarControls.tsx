import React from 'react';
import { ChatThreadsSidebar } from './ChatThreadsSidebar';

interface ChatSidebarControlsProps {
  className?: string;
}

export const ChatSidebarControls: React.FC<ChatSidebarControlsProps> = () => {
  return (
    <div className="w-full flex flex-col gap-4">
      {/* Chat Threads */}
      <ChatThreadsSidebar />
    </div>
  );
};


