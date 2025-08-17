import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useChatStore } from '@/core/store';
import { useReportModal } from '@/contexts/ReportModalContext';
import { sessionManager } from '@/utils/sessionManager';
import { getChatTokens, getHasReportFlag, setHasReportFlag } from '@/services/auth/chatTokens';
import { supabase } from '@/integrations/supabase/client';
import { injectContextMessages } from '@/services/api/conversations';

export const ChatSidebarControls: React.FC = () => {
  const ttsProvider = useChatStore((s) => s.ttsProvider);
  const ttsVoice = useChatStore((s) => s.ttsVoice);
  const setTtsProvider = useChatStore((s) => s.setTtsProvider);
  const setTtsVoice = useChatStore((s) => s.setTtsVoice);
  const { open: openReportModal } = useReportModal();
  const { uuid } = getChatTokens();
  const [hasReport, setHasReport] = useState<boolean>(() => getHasReportFlag());
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const attemptRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const timeoutRef = useRef<any>(null);
  const startedRef = useRef<boolean>(false);

  // Start polling for report_ready_signals when we have no hasReport flag
  useEffect(() => {
    if (!uuid) return;
    if (hasReport) return; // already have it
    if (startedRef.current) return; // prevent duplicate starts across re-renders

    setIsPolling(true);
    let cancelled = false;
    attemptRef.current = 0;
    startRef.current = Date.now();
    // Start logs
    startedRef.current = true;
    console.log('[ReportPolling] start');
    console.log('[ReportPolling] 0 0');

    const poll = async () => {
      try {
        attemptRef.current += 1;
        const { data, error } = await supabase
          .from('report_ready_signals')
          .select('guest_report_id')
          .eq('guest_report_id', uuid)
          .limit(1);

        if (!cancelled && !error && data && data.length > 0) {
          setHasReport(true);
          setHasReportFlag(true);
          setIsPolling(false);
          const elapsedSec = Math.round((Date.now() - startRef.current) / 1000);
          // Log only two numbers: elapsed seconds and attempts
          console.log(`[ReportPolling] ${elapsedSec} ${attemptRef.current}`);
          startedRef.current = false;
          // Optionally inject context as soon as ready if conversation exists
          const conversationId = useChatStore.getState().conversationId;
          if (conversationId) {
            injectContextMessages(conversationId, uuid).catch(() => {});
          }
          return; // stop polling
        }
      } catch (_) {
        // ignore transient errors
      }

      // Check cutoff (12s)
      const elapsedMs = Date.now() - startRef.current;
      if (elapsedMs >= 12000) {
        // Final single ask (no further polling)
        console.log('[ReportPolling] final');
        try {
          attemptRef.current += 1;
          const { data, error } = await supabase
            .from('report_ready_signals')
            .select('guest_report_id')
            .eq('guest_report_id', uuid)
            .limit(1);
          const elapsedSec = Math.round((Date.now() - startRef.current) / 1000);
          console.log(`[ReportPolling] ${elapsedSec} ${attemptRef.current}`);
          if (!cancelled && !error && data && data.length > 0) {
            setHasReport(true);
            setHasReportFlag(true);
            setIsPolling(false);
            startedRef.current = false;
            const conversationId = useChatStore.getState().conversationId;
            if (conversationId) {
              injectContextMessages(conversationId, uuid).catch(() => {});
            }
          } else {
            console.warn('[ReportPolling] no report on the ask');
            setIsPolling(false);
            startedRef.current = false;
          }
        } catch (_) {
          const elapsedSec = Math.round((Date.now() - startRef.current) / 1000);
          console.log(`[ReportPolling] ${elapsedSec} ${attemptRef.current}`);
          console.warn('[ReportPolling] no report on the ask');
          setIsPolling(false);
          startedRef.current = false;
        }
        return;
      }

      if (!cancelled) timeoutRef.current = setTimeout(poll, 1000);
    };

    poll();

    return () => { 
      cancelled = true; 
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (isPolling) {
        const elapsedSec = Math.round((Date.now() - startRef.current) / 1000);
        console.log(`[ReportPolling] ${elapsedSec} ${attemptRef.current}`);
      }
      setIsPolling(false); 
      startedRef.current = false;
    };
  }, [uuid, hasReport]);

  const handleClearSession = async () => {
    await sessionManager.clearSession({ redirectTo: '/', preserveNavigation: false });
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => hasReport && openReportModal()}
          disabled={!hasReport}
          className={`w-full text-left px-3 py-2 text-sm rounded-md border ${hasReport ? 'bg-gray-100 hover:bg-gray-200 border-gray-200' : 'bg-gray-100/60 border-gray-200/60 text-gray-400 cursor-not-allowed'}`}
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
  );
};


