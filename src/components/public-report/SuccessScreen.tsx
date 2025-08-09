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

  // --- 1) SINGLE SOURCE OF TRUTH: Stripe guest_id from URL ---
  const [guestId, setGuestId] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("guest_id");
    if (!id) {
      setIdError("Missing guest_id in URL.");
      return;
    }
    setGuestId(id);
  }, []);

  // --- 2) NORMAL DB CHECK (same as elsewhere): fetch guest_reports by id ---
  const [guestReportData, setGuestReportData] = useState<any>(null);
  const [isLoadingGuestData, setIsLoadingGuestData] = useState(false);

  useEffect(() => {
    if (!guestId) return;

    const loadGuestReport = async () => {
      setIsLoadingGuestData(true);
      const { data, error } = await supabase
        .from("guest_reports")
        .select("*")
        .eq("id", guestId)
        .single();

      setIsLoadingGuestData(false);
      if (error) {
        console.error("[SuccessScreen] Failed to load guest report:", error);
        setIdError("Could not load guest report.");
      } else {
        setGuestReportData(data);
      }
    };

    loadGuestReport();
  }, [guestId]);

  // --- 3) Render values from DB ONLY ---
  const displayName = guestReportData?.person_a?.name ?? "";
  const displayEmail = guestReportData?.person_a?.email ?? "";

  // --- 4) Polling starts only after we have a guestId ---
  const [modalOpened, setModalOpened] = useState(false);
  const pollRef = useRef<NodeJS.Timeout>();
  const frameRef = useRef<number>();

  // Scroll into view on desktop
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

  // Start polling once we have a guestId
  useEffect(() => {
    if (modalOpened || isLoading || !guestId) return;

    pollRef.current = setInterval(async () => {
      const { data, error } = await supabase
        .from("report_ready_signals")
        .select("guest_report_id")
        .eq("guest_report_id", guestId)
        .single();

      if (error?.code && error.code !== "PGRST116") {
        console.error("[SuccessScreen] polling error:", error);
        return;
      }

      if (data?.guest_report_id) {
        clearInterval(pollRef.current as NodeJS.Timeout);
        open(guestId);            // open modal with the same single source of truth
        setModalOpened(true);     // unmount SuccessScreen
      }
    }, 2000);

    return () => clearInterval(pollRef.current as NodeJS.Timeout);
  }, [guestId, modalOpened, open, isLoading]);

  if (modalOpened) return null;

  // --- 5) Basic error surface if Stripe guest_id is missing/bad ---
  if (idError) {
    return (
      <div ref={ref} className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
        <h1 className="text-2xl font-light text-gray-900">We hit a snag</h1>
        <p className="text-gray-600">{idError}</p>
      </div>
    );
  }

  // --- UI ---
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
            {guestReportData ? `Your personalized astrology report is ready for ${displayName}.` : "Loading your details..."}
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
          {isLoading || isLoadingGuestData
            ? "Processing your report request..."
            : "Your report is being prepared and will open automatically when ready..."}
        </p>

        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
          <span className="text-sm text-gray-600">
            {isLoading || isLoadingGuestData ? "Processing request" : "Preparing your report"}
          </span>
        </div>
      </div>
    </div>
  );
});
