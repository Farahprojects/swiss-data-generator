import React, { useState } from 'react';
import { useChatStore } from '@/core/store';
import { useReportModal } from '@/contexts/ReportModalContext';
import { sessionManager } from '@/utils/sessionManager';
import { getChatTokens } from '@/services/auth/chatTokens';
import { useReportReadyStore } from '@/services/report/reportReadyStore';

export const ChatSidebarControls: React.FC = () => {
  const ttsVoice = useChatStore((s) => s.ttsVoice);
  const setTtsVoice = useChatStore((s) => s.setTtsVoice);
  const { open: openReportModal } = useReportModal();
  const { uuid } = getChatTokens();
  const { isPolling, isReportReady } = useReportReadyStore();

  const clearChat = useChatStore((s) => s.clearChat);

  const handleClearSession = async () => {
    // Clear chat store first
    clearChat();
    
    // Then clear all session data
    await sessionManager.clearSession({ redirectTo: '/', preserveNavigation: false });
  };

  const handleVoiceChange = (voice: string) => {
    setTtsVoice(voice);
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
          Report
        </button>
        <button type="button" className="w-full text-left px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-200">
          Voice
        </button>
        <button
          type="button"
          onClick={handleClearSession}
          className="w-full text-left px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-200"
        >
          Clear session
        </button>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Voice</p>
        <select
          className="w-full border rounded-md px-2 py-2 text-sm bg-white"
          value={ttsVoice}
          onChange={(e) => handleVoiceChange(e.target.value)}
        >
          {/* Google Studio HD voices - Female */}
          <option value="Aria">Aria (Female)</option>
          <option value="Bella">Bella (Female)</option>
          <option value="Echo">Echo (Female)</option>
          <option value="Grace">Grace (Female)</option>
          <option value="Iris">Iris (Female)</option>
          <option value="Jade">Jade (Female)</option>
          <option value="Luna">Luna (Female)</option>
          
          {/* Google Studio HD voices - Male */}
          <option value="Charlie">Charlie (Male)</option>
          <option value="Puck">Puck (Male)</option>
          <option value="Duke">Duke (Male)</option>
          <option value="Fable">Fable (Male)</option>
          <option value="Hawk">Hawk (Male)</option>
          <option value="Kai">Kai (Male)</option>
        </select>
      </div>
    </div>
  );
};


