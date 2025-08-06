import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useReportModal } from "@/contexts/ReportModalContext";
import { useReportSubmission } from "@/hooks/useReportSubmission";
import { useMobileDrawer } from "@/contexts/MobileDrawerContext";

interface SuccessScreenProps {
  name: string;
  email: string;
  guestReportId?: string;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({
  name,
  email,
  guestReportId,
}) => {
  /* helpers */
  const { open } = useReportModal();
  const { resetReportState } = useReportSubmission();
  const { closeDrawer } = useMobileDrawer();

  /* flags / timers */
  const [modalOpened, setModalOpened] = useState(false);
  const pollRef = useRef<NodeJS.Timeout>();
  const frameRef = useRef<number>(); // desktop scroll helper

  /* --- scroll to top on desktop once SuccessScreen mounts --- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth >= 768) {
      frameRef.current = requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  /* --- poll for ready signal, then open modal & close drawer --- */
  useEffect(() => {
    if (modalOpened) return;

    pollRef.current = setInterval(async () => {
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
        clearInterval(pollRef.current as NodeJS.Timeout);

        open(guestReportId);   // show report modal
        closeDrawer();         // collapse mobile drawer
        resetReportState();    // clear submission state
        setModalOpened(true);  // unmount SuccessScreen
      }
    }, 2000);

    return () => clearInterval(pollRef.current as NodeJS.Timeout);
  }, [guestReportId, modalOpened, open, closeDrawer, resetReportState]);

  /* unmount once modal is open */
  if (modalOpened) return null;

  /* --------------- UI --------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
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
};
