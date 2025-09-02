import React from 'react';
import { ChatThreadsSidebar } from './ChatThreadsSidebar';

interface ChatSidebarControlsProps {
  isGuestThreadReady?: boolean;
  guestReportId?: string;
}

export const ChatSidebarControls: React.FC<ChatSidebarControlsProps> = ({ isGuestThreadReady = false, guestReportId }) => {
  return (
    <div className="w-full flex flex-col gap-4">
      {/* Chat Threads */}
      <ChatThreadsSidebar isGuestThreadReady={isGuestThreadReady} guestReportId={guestReportId} />
    </div>
  );
};


