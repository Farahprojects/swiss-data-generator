import React from 'react';
import { ChatThreadsSidebar } from './ChatThreadsSidebar';

interface ChatSidebarControlsProps {
  isGuestThreadReady?: boolean;
}

export const ChatSidebarControls: React.FC<ChatSidebarControlsProps> = ({ isGuestThreadReady = false }) => {
  return (
    <div className="w-full flex flex-col gap-4">
      {/* Chat Threads */}
      <ChatThreadsSidebar isGuestThreadReady={isGuestThreadReady} />
    </div>
  );
};


