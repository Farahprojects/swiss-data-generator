import React, { useState, useEffect, useRef, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useReportModal } from "@/contexts/ReportModalContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { hasSeen, markSeen } from "@/utils/seenReportTracker";

interface SuccessScreenProps {
  isLoading: boolean;
  guestId?: string | null;
  isSeen?: boolean;
}

export const SuccessScreen = forwardRef<HTMLDivElement, SuccessScreenProps>(
({ isLoading = false }, ref) => {
  const { open } = useReportModal();
  const isMobile = useIsMobile();

  // --- 1) Resolve guest identity & success flag (single owner: SuccessScreen)
  const [guestId, setGuestId] = useState<string | null>(null);
  const [successFlag, setSuccessFlag] = useState<"1" | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;


    const sp = new URLSearchParams(window.location.search);
    const fromUrlId = sp.get("guest_id");
    const fromUrlSuccess = sp.get("success");

    if (fromUrlId) {
      setGuestId(fromUrlId);
      try { sessionStorage.setItem("guestId", fromUrlId); } catch {}
    } else {
      let ssId: string | null = null;
      try {
        ssId = sessionStorage.getItem("guestId") || sessionStorage.getItem("guest_id") || null;
      } catch {}
      if (ssId) setGuestId(ssId);
    }

    if (fromUrlSuccess === "1") {
      setSuccessFlag("1");
      try { sessionStorage.setItem("success", "1"); } catch {}
    } else {
      try {
        const ssSuccess = sessionStorage.getItem("success") === "1" ? "1" : null;
        if (ssSuccess) setSuccessFlag("1");
      } catch {}
    }
  }, []);

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

  // --- 4) Readiness listener (WebSocket) — starts when UI is ready
  const [modalOpened, setModalOpened] = useState(false);
  const wsStartedRef = useRef(false);
  const wsStoppedRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const seenMarkedRef = useRef(false);
  const wsTriggeredRef = useRef(false);

  useEffect(() => {
    if (modalOpened || isLoading || successFlag === "1" || !uiReady || wsStartedRef.current || wsStoppedRef.current) return;

    wsStartedRef.current = true;
    const channel = supabase.channel(`ready_${guestId}`);
    channelRef.current = channel;

    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'report_ready_signals', filter: `guest_report_id=eq.${guestId}` },
      () => {
        if (wsStoppedRef.current) return;
        // Stop first
        wsStoppedRef.current = true;
        try { channel.unsubscribe(); } catch {}

        // Handoff
        wsTriggeredRef.current = true;
        open(guestId as string);
        setModalOpened(true);
        try { sessionStorage.removeItem('guest_id'); } catch {}
        // Seen flag marking (idempotent, after open)
        {
          const isReadyForSeenMark = Boolean(
            guestId && !isLoading && dbReady && guestReportData && uiReady && wsTriggeredRef.current
          );
          if (!seenMarkedRef.current && isReadyForSeenMark) {
            try { markSeen(guestId as string); } catch {}
            seenMarkedRef.current = true;
            console.log(`[SeenFlag] ready=true for ${guestId}, marking seen @${Date.now()}`);
          }
        }
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
  }, [uiReady, modalOpened, open, isLoading, guestId, successFlag]);

  // Success=1 bypass: open immediately without WS
  useEffect(() => {
    if (modalOpened) return;
    if (successFlag === "1" && guestId) {
      wsStoppedRef.current = true;
      if (channelRef.current) { try { channelRef.current.unsubscribe(); } catch {} channelRef.current = null; }
      try { markSeen(guestId); } catch {}
      seenMarkedRef.current = true;
      open(guestId);
      setModalOpened(true);
    }
  }, [successFlag, guestId, modalOpened, open]);

  // Auto-open if already seen and DB confirms existence
  useEffect(() => {
    if (modalOpened || successFlag === "1") return;
    if (guestId && dbReady && hasSeen(guestId)) {
      if (!seenMarkedRef.current) { try { markSeen(guestId); } catch {} seenMarkedRef.current = true; }
      open(guestId);
      setModalOpened(true);
    }
  }, [dbReady, guestId, modalOpened, successFlag, open]);

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

  // --- 6) Unmount after modal opens
  if (modalOpened) return null;

  // --- 7) Error surfaces (why we’re not progressing)
  if (dbError) {
    return (
      <div ref={ref} className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
        <h1 className="text-2xl font-light text-gray-900">We hit a snag</h1>
        <p className="text-sm text-red-600 whitespace-pre-wrap">{dbError}</p>
        <p className="text-xs text-gray-500">Polling blocked until the guest report is found.</p>
      </div>
    );
  }

  // --- 8) UI (explicitly shows guest_id + email so we know uiReady truthfully reflects UI state)
  const showLoading = isLoading || !dbReady;

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
            {showLoading ? "Loading your details..." : `Your personalized astrology report is ready for ${displayName}.`}
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Guest ID:</span>
          <span className="font-mono text-gray-900 truncate max-w-[220px]" title={guestId || ""}>
            {guestId || ""}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Name:</span>
          <span className="font-medium text-gray-900">{displayName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Email:</span>
          <span className="font-medium text-gray-900">{displayEmail}</span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          {showLoading
            ? "Processing your report request..."
            : (uiReady
                ? "Your report is being prepared and will open automatically when ready..."
                : "Waiting for identity (guest_id & email) to render...")}
        </p>

        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
          <span className="text-sm text-gray-600">
            {showLoading ? "Processing request" : (uiReady ? "Preparing your report" : "Awaiting identity")}
          </span>
        </div>
      </div>
    </div>
  );
});
