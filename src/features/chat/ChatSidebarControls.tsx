import React from 'react';
import { ChatThreadsSidebar } from './ChatThreadsSidebar';

interface ChatSidebarControlsProps {
  className?: string;
  onDelete?: () => void;
}

export const ChatSidebarControls: React.FC<ChatSidebarControlsProps> = ({ onDelete }) => {
  return (
    <div className="w-full flex flex-col gap-4">
      {/* Chat Threads */}
      <ChatThreadsSidebar onDelete={onDelete} />
    </div>
  );
};


