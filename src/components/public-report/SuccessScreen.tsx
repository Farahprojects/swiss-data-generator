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

  // --- 4) Polling (gated by uiReady)
  const [modalOpened, setModalOpened] = useState(false);
  const pollRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (modalOpened || isLoading || !uiReady) return;

    pollRef.current = setInterval(async () => {
      const { data, error } = await supabase
        .from("report_logs")
        .select("user_id")
        .eq("user_id", guestId as string)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // ignore "no rows" (PGRST116), log other errors
      if (error?.code && error.code !== "PGRST116") {
        console.error("[SuccessScreen] polling error:", error);
        return;
      }

      if (data?.user_id) {
        clearInterval(pollRef.current as NodeJS.Timeout);
        open(guestId as string);
        setModalOpened(true);
        try { sessionStorage.removeItem("guest_id"); } catch {}
      }
    }, 2000);

    return () => clearInterval(pollRef.current as NodeJS.Timeout);
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
