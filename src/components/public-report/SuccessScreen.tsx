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

  // --- 1) Resolve guest identity (seen-based; ignore success flag)
  const [guestId, setGuestId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;

    const resolveGuestId = (): string | null => {
      const q = new URLSearchParams(window.location.search);
      const fromUrl = q.get("guest_id");
      if (fromUrl) return fromUrl;

      try {
        const last = localStorage.getItem("seen:last");
        if (last) return last;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)!;
          if (k && k.startsWith("seen:") && k !== "seen:last") return k.slice(5);
        }
      } catch {}
      return null;
    };

    setGuestId(resolveGuestId());
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
        wsTriggeredRef.current = true;
        console.log('🔎 [DEBUG][SuccessScreen] WS trigger -> open()', {
          guestId,
          uiReady,
          dbReady,
          isLoading,
          ts: new Date().toISOString()
        });
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
  }, [uiReady, modalOpened, open, isLoading, guestId]);


  // Auto-open if already seen and DB confirms existence
  useEffect(() => {
    if (modalOpened) return;
    if (guestId && dbReady && hasSeen(guestId)) {
      if (!seenMarkedRef.current) { try { markSeen(guestId); } catch {} seenMarkedRef.current = true; }
      console.log('🔎 [DEBUG][SuccessScreen] seen auto-open -> open()', {
        guestId,
        uiReady,
        dbReady,
        isLoading,
        ts: new Date().toISOString()
      });
      open(guestId);
      setModalOpened(true);
    }
  }, [dbReady, guestId, modalOpened, open]);

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
