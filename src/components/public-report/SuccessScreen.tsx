import React, { useState, useEffect, useRef, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useReportModal } from "@/contexts/ReportModalContext";

import { useIsMobile } from "@/hooks/use-mobile";

interface SuccessScreenProps {
  name: string;
  email: string;
  guestReportId?: string;
}

export const SuccessScreen = forwardRef<HTMLDivElement, SuccessScreenProps>(({
  name,
  email,
  guestReportId,
}, ref) => {
  /* helpers */
  const { open } = useReportModal();
  
  const isMobile = useIsMobile();

  /* flags / timers */
  const [modalOpened, setModalOpened] = useState(false);
  const frameRef = useRef<number>(); // desktop scroll helper

  /* --- scroll to success screen on desktop once SuccessScreen mounts --- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 768) {
      frameRef.current = requestAnimationFrame(() => {
        // Scroll to the success screen itself instead of top of page
        if (ref && typeof ref === 'object' && ref.current) {
          ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [ref]);

  /* --- realtime listener for ready signal, then open modal --- */
  useEffect(() => {
    if (modalOpened || !guestReportId) return;

    console.log("[SuccessScreen] Setting up realtime listener for:", guestReportId);

    const channel = supabase
      .channel(`report-ready-${guestReportId}`) // unique channel per report
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'report_ready_signals',
          filter: `guest_report_id=eq.${guestReportId}`
        },
        (payload) => {
          console.log("[SuccessScreen] Report ready signal received:", payload);
          // Immediately cleanup and open modal
          supabase.removeChannel(channel);
          open(guestReportId);
          setModalOpened(true);
        }
      )
      .subscribe((status) => {
        console.log("[SuccessScreen] Channel subscription status:", status);
      });

    // Check if signal already exists (in case it was inserted before listener setup)
    const checkExistingSignal = async () => {
      const { data } = await supabase
        .from("report_ready_signals")
        .select("guest_report_id")
        .eq("guest_report_id", guestReportId)
        .single();
      
      if (data && !modalOpened) {
        console.log("[SuccessScreen] Found existing signal, opening modal immediately");
        supabase.removeChannel(channel);
        open(guestReportId);
        setModalOpened(true);
      }
    };

    // Small delay to ensure channel is subscribed before checking
    const timeoutId = setTimeout(checkExistingSignal, 100);

    return () => {
      console.log("[SuccessScreen] Cleaning up realtime listener");
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [guestReportId, modalOpened, open]);

  /* unmount once modal is open */
  if (modalOpened) return null;

  /* --------------- UI --------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-light text-gray-900">Report Generated Successfully!</h1>
            <p className="text-gray-600">
              Your personalized astrology report is ready for {name}.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Name:</span>
            <span className="font-medium text-gray-900">{name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Email:</span>
            <span className="font-medium text-gray-900">{email}</span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Your report is being prepared and will open automatically when ready...
          </p>

          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            <span className="text-sm text-gray-600">Preparing your report</span>
          </div>
        </div>
      </div>
    </div>
  );
});
