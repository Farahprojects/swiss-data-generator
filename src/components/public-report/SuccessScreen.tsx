import React, { useState, useEffect, useRef, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useReportModal } from "@/contexts/ReportModalContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { hasSeen, markSeen } from "@/utils/seenReportTracker";
import { sessionManager } from "@/utils/sessionManager";
import { logUserError } from "@/services/errorService";
import ErrorStateHandler from "@/components/public-report/ErrorStateHandler";

interface SuccessScreenProps {
  isLoading: boolean;
  guestId?: string | null;
  isSeen?: boolean;
}

export const SuccessScreen = forwardRef<HTMLDivElement, SuccessScreenProps>(
({ isLoading = false }, ref) => {
  const { open } = useReportModal();
  const isMobile = useIsMobile();

  // --- 1) Resolve guest identity and URL
  const [guestId, setGuestId] = useState<string | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = window.location.href;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('guest_id');
    const last = localStorage.getItem('seen:last');
    const decided = fromUrl || last;
    setGuestId(decided || null);

    const hasSeenDirect = decided ? !!localStorage.getItem(`seen:${decided}`) : false;
    console.log('[ReportDetect]', {
      url,
      seenLast: last,
      hasSeenDirect,
      decidedGuestId: decided,
      autoOpen: hasSeenDirect
    });

    if (decided && hasSeenDirect && !modalOpened) {
      open(decided);
      setModalOpened(true);
    }
  }, [open]);

  // --- 2) DB check (must succeed or we STOP)
  const [guestReportData, setGuestReportData] = useState<any>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    setDbReady(false);
    setDbError(null);
    setGuestReportData(null);

    if (!guestId) {
      setDbError("Missing guest_id in URL.");
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("guest_reports")
        .select("*")
        .eq("id", guestId)
        .single();

      if (error) {
        setDbError(`[DB] Failed to load guest report for id=${guestId}: ${error.message || error.code}`);
        return; // hard stop
      }
      if (!data) {
        setDbError(`[DB] No guest report found for id=${guestId}.`);
        return; // hard stop
      }

      setGuestReportData(data);
      setDbReady(true);
    })();
  }, [guestId]);

  // --- 3) UI identity (we only poll AFTER the UI is ready to show both)
  const displayName  = guestReportData?.person_a?.name  ?? guestReportData?.name  ?? "";
  const displayEmail = guestReportData?.email ?? guestReportData?.person_a?.email ?? "";
  const uiReady = Boolean(guestId && displayEmail); // must have BOTH to start polling

  // WebSocket listener retained but will not start if modal opens via seen-bypass
  const [modalOpened, setModalOpened] = useState(false);
  const wsStartedRef = useRef(false);
  const wsStoppedRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const seenMarkedRef = useRef(false);
  const wsTriggeredRef = useRef(false);

  useEffect(() => {
    if (modalOpened || !guestId || wsStartedRef.current || wsStoppedRef.current) return;

    wsStartedRef.current = true;
    const channel = supabase.channel(`ready_${guestId}`);
    channelRef.current = channel;

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'report_ready_signals', filter: `guest_report_id=eq.${guestId}` },
      () => {
        if (wsStoppedRef.current) return;
        wsStoppedRef.current = true;
        try { channel.unsubscribe(); } catch {}
        wsTriggeredRef.current = true;
        open(guestId as string);
        setModalOpened(true);
      }
    );

    channel.subscribe();

    return () => {
      wsStoppedRef.current = true;
      if (channelRef.current) {
        try { channelRef.current.unsubscribe(); } catch {}
        channelRef.current = null;
      }
    };
  }, [guestId, modalOpened, open]);
  // Log errors but don't auto-redirect to avoid infinite loops
  useEffect(() => {
    if (!dbError || !guestId) return;
    
    logUserError({ 
      guestReportId: guestId, 
      errorType: 'success_screen_snag', 
      errorMessage: dbError 
    }).catch(e => {
      console.warn('[SuccessScreen] Failed to log snag error', e);
    });
  }, [dbError, guestId]);

  useEffect(() => {
    if (modalOpened) return;
    if (!guestId) return;
    const wasSeenResult = !!localStorage.getItem(`seen:${guestId}`);
    if (wasSeenResult) {
      open(guestId);
      setModalOpened(true);
    }
  }, [guestId, modalOpened, open]);

  // --- 5) Smooth scroll on desktop
  const frameRef = useRef<number>();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 768) {
      frameRef.current = requestAnimationFrame(() => {
        if (ref && typeof ref === "object" && ref.current) {
          ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [ref]);

  return (
    <div ref={ref} className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
      <div className="space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-light text-gray-900">Report Generated Successfully!</h1>
          <p className="text-gray-600">
            {isLoading ? "Loading your details..." : `Your personalized astrology report is being prepared.`}
          </p>
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-sm text-gray-600">It will open automatically.</p>
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
          <span className="text-sm text-gray-600">Preparing your report</span>
        </div>
      </div>
    </div>
  );
});
