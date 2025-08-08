import React, { useState, useEffect, useRef, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useReportModal } from "@/contexts/ReportModalContext";
import { getFormMemory } from "@/utils/formMemoryCache";

import { useIsMobile } from "@/hooks/use-mobile";

interface SuccessScreenProps {
  name: string;
  email: string;
  guestReportId?: string;
  isLoading?: boolean;
}

export const SuccessScreen = forwardRef<HTMLDivElement, SuccessScreenProps>(({
  name,
  email,
  guestReportId,
  isLoading = false,
}, ref) => {
  /* helpers */
  const { open } = useReportModal();
  
  const isMobile = useIsMobile();

  /* get name/email from memory if not provided as props */
  const memoryData = getFormMemory();
  const displayName = name || memoryData?.name || '';
  const displayEmail = email || memoryData?.email || '';

  /* flags / timers */
  const [modalOpened, setModalOpened] = useState(false);
  const pollRef = useRef<NodeJS.Timeout>();
  const frameRef = useRef<number>(); // desktop scroll helper

  // T5 - SuccessScreen mount
  useEffect(() => {
    const T5 = Date.now();
    console.log('🔍 [DIAGNOSTIC] T5 - SuccessScreen mount:', { label: 'T5', ts: T5, status: 'success_screen_mounted' });
  }, []);

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

  /* --- poll for ready signal, then open modal & close drawer --- */
  useEffect(() => {
    if (modalOpened || isLoading || !guestReportId) return;

    // T6 - Polling starts
    const T6 = Date.now();
    console.log('🔍 [DIAGNOSTIC] T6 - Polling starts:', { label: 'T6', ts: T6, status: 'polling_started' });

    let pollCount = 0;
    const maxPolls = 30; // 60 seconds max (30 * 2 seconds)

    pollRef.current = setInterval(async () => {
      pollCount++;
      console.log(`🔍 [DIAGNOSTIC] Poll attempt ${pollCount}/${maxPolls} for guestReportId: ${guestReportId}`);
      
      const { data, error } = await supabase
        .from("report_ready_signals")
        .select("guest_report_id")
        .eq("guest_report_id", guestReportId)
        .single();

      if (error?.code && error.code !== "PGRST116") {
        console.error("[SuccessScreen] polling error:", error);
        return;
      }

      if (data?.guest_report_id) {
        console.log(`✅ [DIAGNOSTIC] Signal found on poll ${pollCount}! Opening modal...`);
        clearInterval(pollRef.current as NodeJS.Timeout);

        open(guestReportId);           // show report modal
        // Note: Removed resetReportState() to preserve state on refresh
        setModalOpened(true);          // unmount SuccessScreen
      } else {
        console.log(`⏳ [DIAGNOSTIC] No signal yet on poll ${pollCount} (${pollCount * 2}s elapsed)`);
        
        // If we've been polling for too long, show a message
        if (pollCount >= maxPolls) {
          console.warn(`⚠️ [DIAGNOSTIC] Polling timeout after ${maxPolls * 2}s - no signal found`);
          clearInterval(pollRef.current as NodeJS.Timeout);
        }
      }
    }, 2000);

    return () => clearInterval(pollRef.current as NodeJS.Timeout);
  }, [guestReportId, modalOpened, open, isLoading]);

  /* unmount once modal is open */
  if (modalOpened) return null;

  /* --------------- UI --------------- */
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
              Your personalized astrology report is ready for {displayName}.
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
            {isLoading 
              ? "Processing your report request..." 
              : "Your report is being prepared and will open automatically when ready..."
            }
          </p>

          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            <span className="text-sm text-gray-600">
              {isLoading ? "Processing request" : "Preparing your report"}
            </span>
          </div>
        </div>
    </div>
  );
});
