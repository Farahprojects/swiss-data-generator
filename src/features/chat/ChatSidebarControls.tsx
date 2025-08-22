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
          {/* Google Chirp 3 HD Voices - Male */}
          <optgroup label="Male">
            <option value="Puck">Puck</option>
            <option value="Achird">Achird</option>
            <option value="Algenib">Algenib</option>
            <option value="Charon">Charon</option>
            <option value="Enceladus">Enceladus</option>
            <option value="Fenrir">Fenrir</option>
            <option value="Orus">Orus</option>
            <option value="Rasalgethi">Rasalgethi</option>
          </optgroup>
          {/* Google Chirp 3 HD Voices - Female */}
          <optgroup label="Female">
            <option value="Achernar">Achernar</option>
            <option value="Aoede">Aoede</option>
            <option value="Callirrhoe">Callirrhoe</option>
            <option value="Despina">Despina</option>
            <option value="Gacrux">Gacrux</option>
            <option value="Kore">Kore</option>
            <option value="Leda">Leda</option>
            <option value="Sulafat">Sulafat</option>
            <option value="Zephyr">Zephyr</option>
          </optgroup>
        </select>
      </div>
    </div>
  );
};


