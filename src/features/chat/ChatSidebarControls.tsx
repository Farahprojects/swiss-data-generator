import React, { useState } from 'react';
import { useChatStore } from '@/core/store';
import { useReportModal } from '@/contexts/ReportModalContext';
import { sessionManager } from '@/utils/sessionManager';
import { getChatTokens } from '@/services/auth/chatTokens';
import { useReportReadyStore } from '@/services/report/reportReadyStore';
import { SettingsButton } from '@/components/settings/SettingsButton';

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
              <option value="en-US-Wavenet-D">Wavenet-D (US)</option>
              <option value="en-US-Wavenet-B">Wavenet-B (US)</option>
              <option value="en-GB-Wavenet-D">Wavenet-D (UK)</option>
              <option value="en-GB-Wavenet-B">Wavenet-B (UK)</option>
              <option value="en-AU-Wavenet-D">Wavenet-D (AU)</option>
              <option value="en-AU-Wavenet-B">Wavenet-B (AU)</option>
            </optgroup>
            <optgroup label="Female">
              <option value="en-US-Wavenet-C">Wavenet-C (US)</option>
              <option value="en-US-Wavenet-E">Wavenet-E (US)</option>
              <option value="en-US-Wavenet-F">Wavenet-F (US)</option>
              <option value="en-GB-Wavenet-C">Wavenet-C (UK)</option>
              <option value="en-GB-Wavenet-A">Wavenet-A (UK)</option>
              <option value="en-GB-Wavenet-F">Wavenet-F (UK)</option>
              <option value="en-AU-Wavenet-C">Wavenet-C (AU)</option>
              <option value="en-AU-Wavenet-A">Wavenet-A (AU)</option>
            </optgroup>
          </select>
        </div>
      </div>
      
      {/* Settings Button at the bottom */}
      <div className="mt-auto pt-4">
        <SettingsButton 
          className="w-full justify-start" 
          variant="outline" 
          size="sm"
        />
      </div>
    </div>
  );
};


