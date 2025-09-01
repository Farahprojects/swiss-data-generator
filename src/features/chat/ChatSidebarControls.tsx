import React, { useState } from 'react';
import { useChatStore } from '@/core/store';
import { useReportModal } from '@/contexts/ReportModalContext';
import { sessionManager } from '@/utils/sessionManager';
import { getChatTokens } from '@/services/auth/chatTokens';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import { SettingsButton } from '@/components/settings/SettingsButton';
import { UserAvatar } from '@/components/settings/UserAvatar';
import { useAuth } from '@/contexts/AuthContext';

export const ChatSidebarControls: React.FC = () => {
  const ttsVoice = useChatStore((s) => s.ttsVoice);
  const setTtsVoice = useChatStore((s) => s.setTtsVoice);
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
          {isPolling ? 'Generating...' : 'Report'}
        </button>
        <button
          type="button"
          onClick={handleClearSession}
          className="w-full text-left px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-200"
        >
          Clear session
        </button>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
            Assistant Voice
          </p>
          <select
            id="tts-voice"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-700 bg-gray-900 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={ttsVoice}
            onChange={(e) => handleVoiceChange(e.target.value)}
          >
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
      
      {/* User Avatar or Sign In at the bottom */}
      <div className="mt-auto pt-4">
        {user ? (
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => {}}>
            <UserAvatar size="sm" />
            <SettingsButton 
              className="flex-1 justify-start" 
              variant="outline" 
              size="sm"
              showIcon={false}
              label="Settings"
            />
          </div>
        ) : (
          <div className="text-sm text-gray-500 text-center py-2">
            Sign in
          </div>
        )}
      </div>
    </div>
  );
};


