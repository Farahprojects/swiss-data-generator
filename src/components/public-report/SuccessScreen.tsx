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

  // 1) Single source of truth: guest_id from URL
  const [guestId, setGuestId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("guest_id");
    setGuestId(id);
  }, []);

  // 2) DB check state
  const [guestReportData, setGuestReportData] = useState<any>(null);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // 3) Do the DB check (HARD STOP if this fails; we never poll)
  useEffect(() => {
    setDbReady(false);
    setDbError(null);
    setGuestReportData(null);

    if (!guestId) {
      setDbError("Missing guest_id in URL.");
      return;
    }

    const run = async () => {
      const { data, error } = await supabase
        .from("guest_reports")
        .select("*")
        .eq("id", guestId)
        .single();

      if (error) {
        setDbError(`[DB] Failed to load guest report for id=${guestId}: ${error.message || error.code}`);
        return; // hard stop: NO polling
      }
      if (!data) {
        setDbError(`[DB] No guest report found for id=${guestId}.`);
        return; // hard stop: NO polling
      }

      setGuestReportData(data);
      setDbReady(true); // only now can polling begin
    };

    run();
  }, [guestId]);

  const displayName = guestReportData?.person_a?.name ?? "";
  const displayEmail = guestReportData?.person_a?.email ?? "";

  // 4) Polling (gated by dbReady). Never runs on error.
  const [modalOpened, setModalOpened] = useState(false);
  const pollRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (modalOpened || isLoading || !guestId || !dbReady) return;

    pollRef.current = setInterval(async () => {
      const { data, error } = await supabase
        .from("report_ready_signals")
        .select("guest_report_id")
        .eq("guest_report_id", guestId)
        .single();

      // ignore "no rows" error (PGRST116), surface other errors to console
      if (error?.code && error.code !== "PGRST116") {
        console.error("[SuccessScreen] polling error:", error);
        return;
      }

      if (data?.guest_report_id) {
        clearInterval(pollRef.current as NodeJS.Timeout);
        open(guestId);
        setModalOpened(true);
      }
    }, 2000);

    return () => clearInterval(pollRef.current as NodeJS.Timeout);
  }, [guestId, dbReady, modalOpened, open, isLoading]);

  if (modalOpened) return null;

  // 5) Error UI (explicit: why the screen isn’t progressing)
  if (dbError) {
    return (
      <div ref={ref} className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
        <h1 className="text-2xl font-light text-gray-900">We hit a snag</h1>
        <p className="text-sm text-red-600 whitespace-pre-wrap">{dbError}</p>
        <p className="text-sm text-gray-600">Polling is paused until the guest report is found.</p>
      </div>
    );
  }

  // 6) UI (loads name/email from DB only)
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
            {dbReady ? `Your personalized astrology report is ready for ${displayName}.` : "Loading your details..."}
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
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
          {isLoading || !dbReady
            ? "Processing your report request..."
            : "Your report is being prepared and will open automatically when ready..."}
        </p>

        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
          <span className="text-sm text-gray-600">
            {isLoading || !dbReady ? "Processing request" : "Preparing your report"}
          </span>
        </div>
      </div>
    </div>
  );
});
