import React from 'react';
import { ChatThreadsSidebar } from './ChatThreadsSidebar';

export const ChatSidebarControls: React.FC = () => {
  return (
    <div className="w-full flex flex-col gap-4">
      {/* Chat Threads */}
      <ChatThreadsSidebar />
    </div>
  );
};


