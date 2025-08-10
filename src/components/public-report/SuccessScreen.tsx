import React, { useState, useEffect, useRef, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useReportModal } from "@/contexts/ReportModalContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface SuccessScreenProps {
  isLoading?: boolean;
}

export const SuccessScreen = forwardRef<HTMLDivElement, SuccessScreenProps>(
({ isLoading = false }, ref) => {
  const { open } = useReportModal();
  const isMobile = useIsMobile();

  // --- 1) Resolve guest_id: URL param first, then sessionStorage fallback
  const [guestId, setGuestId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get("guest_id");
    if (urlId) {
      setGuestId(urlId);
      return;
    }
    try {
      const storedId = sessionStorage.getItem("guest_id");
      if (storedId) {
        setGuestId(storedId);
      }
    } catch {}
  }, []);

  // Gracefully wait a short period for guest_id to appear (mobile path)
  useEffect(() => {
    if (guestId) return;
    let stopped = false;
    const start = Date.now();
    const GRACE_MS = 3000;
    const tick = () => {
      if (stopped) return;
      try {
        const id = sessionStorage.getItem('guest_id');
        if (id) { setGuestId(id); return; }
      } catch {}
      if (Date.now() - start >= GRACE_MS) {
        setDbError("Missing guest_id in URL.");
        return;
      }
      setTimeout(tick, 250);
    };
    tick();
    return () => { stopped = true; };
  }, [guestId]);

  // --- 2) DB check (must succeed or we STOP)
  const [guestReportData, setGuestReportData] = useState<any>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    setDbReady(false);
    setDbError(null);
    setGuestReportData(null);

    if (!guestId) return;

    (async () => {
      const GRACE_MS = 3000;
      const RETRY_MS = 300;
      const deadline = Date.now() + GRACE_MS;
      let lastError: any = null;
      while (Date.now() <= deadline) {
        const { data, error } = await supabase
          .from("guest_reports")
          .select("*")
          .eq("id", guestId)
          .single();
        if (!error && data) {
          setGuestReportData(data);
          setDbReady(true);
          return;
        }
        lastError = error;
        await new Promise(r => setTimeout(r, RETRY_MS));
      }
      setDbError(lastError
        ? `[DB] Failed to load guest report for id=${guestId}: ${lastError.message || lastError.code}`
        : `[DB] No guest report found for id=${guestId}.`);
    })();
  }, [guestId]);

  // --- 3) UI identity (we only poll AFTER the UI is ready to show both)
  const displayName  = guestReportData?.person_a?.name  ?? guestReportData?.name  ?? "";
  const displayEmail = guestReportData?.email ?? guestReportData?.person_a?.email ?? "";
  const uiReady = Boolean(guestId && displayEmail); // must have BOTH to start polling

  // Modal state must be defined before effects referencing it
  const [modalOpened, setModalOpened] = useState(false);

  // One-time upset signal if uiReady cannot start
  const upsetLoggedRef = useRef(false);
  useEffect(() => {
    if (upsetLoggedRef.current || modalOpened) return;
    // If we have no guestId at all, we can never start
    if (!guestId) {
      console.warn('[SuccessScreen][uiReady] Cannot start: missing guest_id (mobile/desktop).');
      upsetLoggedRef.current = true;
      return;
    }
    // If DB finished but email is missing, uiReady will never be true
    if (dbReady && !displayEmail) {
      console.warn(`[SuccessScreen][uiReady] Cannot start: missing email for guest_id=${guestId}.`);
      upsetLoggedRef.current = true;
    }
  }, [guestId, dbReady, displayEmail, modalOpened]);

  // --- 4) Readiness listener (WebSocket) — starts when UI is ready
  const wsStartedRef = useRef(false);
  const wsStoppedRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (modalOpened || isLoading || !uiReady || wsStartedRef.current || wsStoppedRef.current) return;

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
        open(guestId as string);
        setModalOpened(true);
        try { sessionStorage.removeItem('guest_id'); } catch {}
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
  }, [uiReady, modalOpened, open, isLoading, guestId]);

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
