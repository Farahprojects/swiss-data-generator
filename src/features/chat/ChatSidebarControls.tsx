import React, { useEffect, useState } from 'react';
import { useChatStore } from '@/core/store';
import { useReportData } from '@/hooks/useReportData';
import { ReportViewer } from '@/components/public-report/ReportViewer';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export const ChatSidebarControls: React.FC = () => {
  const ttsProvider = useChatStore((s) => s.ttsProvider);
  const ttsVoice = useChatStore((s) => s.ttsVoice);
  const setTtsProvider = useChatStore((s) => s.setTtsProvider);
  const setTtsVoice = useChatStore((s) => s.setTtsVoice);
  const conversationId = useChatStore((s) => s.conversationId);
  const { reportData, isLoading, error } = useReportData(conversationId);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const handleOpenReport = () => {
    if (reportData) {
      setIsReportModalOpen(true);
    }
  };

  useEffect(() => {
    if (isReportModalOpen) {
      document.body.classList.add('no-scroll-report-open');
    } else {
      document.body.classList.remove('no-scroll-report-open');
    }

    return () => {
      document.body.classList.remove('no-scroll-report-open');
    };
  }, [isReportModalOpen]);

  return (
    <>
      <div className="w-full flex flex-col gap-4">
        {conversationId && (
          <button
            onClick={handleOpenReport}
            disabled={isLoading || !reportData}
            className="w-full text-left px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md disabled:opacity-50"
          >
            {isLoading
              ? 'Loading Report...'
              : reportData
              ? 'View Full Report'
              : 'Report Not Available'}
          </button>
        )}
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">TTS Provider</p>
          <select
            className="w-full border rounded-md px-2 py-2 text-sm bg-white"
            value={ttsProvider}
            onChange={(e) => setTtsProvider(e.target.value as 'google' | 'openai')}
          >
            <option value="google">Google</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Voice</p>
          {ttsProvider === 'openai' ? (
            <select
              className="w-full border rounded-md px-2 py-2 text-sm bg-white"
              value={ttsVoice}
              onChange={(e) => setTtsVoice(e.target.value)}
            >
              <option value="alloy">Alloy</option>
              <option value="ash">Ash</option>
              <option value="coral">Coral</option>
              <option value="echo">Echo</option>
              <option value="fable">Fable</option>
              <option value="nova">Nova</option>
              <option value="onyx">Onyx</option>
              <option value="sage">Sage</option>
              <option value="shimmer">Shimmer</option>
            </select>
          ) : (
            <select
              className="w-full border rounded-md px-2 py-2 text-sm bg-white"
              value={ttsVoice}
              onChange={(e) => setTtsVoice(e.target.value)}
            >
              {/* Google HD/Studio voices */}
              <option value="en-US-Studio-O">en-US-Studio-O (F)</option>
              <option value="en-US-Studio-Q">en-US-Studio-Q (F)</option>
              <option value="en-US-Studio-M">en-US-Studio-M (M)</option>
              <option value="en-GB-Wavenet-F">en-GB-Wavenet-F (F)</option>
              <option value="en-AU-Wavenet-C">en-AU-Wavenet-C (F)</option>
            </select>
          )}
        </div>
      </div>
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          {reportData && (
            <ReportViewer
              reportData={reportData}
              onBack={() => setIsReportModalOpen(false)}
              onStateReset={() => setIsReportModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};


