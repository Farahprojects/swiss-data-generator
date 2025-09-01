import React from 'react';
import { useReportModal } from '@/contexts/ReportModalContext';
import { sessionManager } from '@/utils/sessionManager';
import { getChatTokens } from '@/services/auth/chatTokens';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import { useAuth } from '@/contexts/AuthContext';

export const ChatSidebarControls: React.FC = () => {
  const { open: openReportModal } = useReportModal();
  const { uuid } = getChatTokens();
  const { isPolling, isReportReady } = useReportReadyStore();
  const { user } = useAuth();

  const clearChat = useChatStore((s) => s.clearChat);

  const handleClearSession = async () => {
    // Clear chat store first
    clearChat();
    
    // Then clear all session data
    await sessionManager.clearSession({ redirectTo: '/', preserveNavigation: false });
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => uuid && openReportModal(uuid)}
          disabled={!isReportReady || !uuid}
          className={`w-full text-left px-3 py-2 text-sm rounded-md border ${
            isReportReady && uuid
              ? 'bg-gray-100 hover:bg-gray-200 border-gray-200' 
              : 'bg-gray-100/60 border-gray-200/60 text-gray-400 cursor-not-allowed'
          } ${isPolling ? 'animate-pulse' : ''}`}
        >
          {isPolling ? 'Generating...' : 'Report'}
        </button>
        {/* Only show Clear session for guest users */}
        {!user && (
          <button
            type="button"
            onClick={handleClearSession}
            className="w-full text-left px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-200"
          >
            Clear session
          </button>
        )}
      </div>

    </div>
  );
};


