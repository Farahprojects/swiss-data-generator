import React from 'react';
import { ChatThreadsSidebar } from './ChatThreadsSidebar';

interface ChatSidebarControlsProps {
  className?: string;
  onDelete?: () => void;
}

export const ChatSidebarControls: React.FC<ChatSidebarControlsProps> = ({ onDelete }) => {
  return (
    <div className="w-full h-full flex flex-col">
      {/* Chat Threads */}
      <ChatThreadsSidebar className="h-full" onDelete={onDelete} />
    </div>
  );
};


