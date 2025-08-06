import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useReportModal } from "@/contexts/ReportModalContext";
import { useReportSubmission } from "@/hooks/useReportSubmission";
import { supabase } from "@/integrations/supabase/client";
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
  /** modal + global state helpers */
  const { open } = useReportModal();
  const { resetReportState } = useReportSubmission();
  const { closeDrawer } = useMobileDrawer();

  /** local flags */
  const [hasOpenedModal, setHasOpenedModal] = useState(false);
  const frameRef = useRef<number>();
  const pollRef = useRef<NodeJS.Timeout>();

  /** open modal + schedule state reset (guaranteed after paint) */
  const openModalAndReset = useCallback(() => {
    if (hasOpenedModal) return;

    open(guestReportId);
    closeDrawer();        // Close the mobile drawer immediately
    setHasOpenedModal(true);

    frameRef.current = requestAnimationFrame(() => {
      resetReportState();
    });
  }, [guestReportId, hasOpenedModal, open, resetReportState, closeDrawer]);

  /** poll Supabase until report_ready_signals row exists */
  useEffect(() => {
    if (hasOpenedModal) return;

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
        openModalAndReset();
      }
    }, 2000);

    return () => clearInterval(pollRef.current as NodeJS.Timeout);
  }, [guestReportId, hasOpenedModal, openModalAndReset]);

  /** clean up any pending animation frame */
  useEffect(() => () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  }, []);

  /* ----------- RENDER ----------- */

  /* Once the modal has opened, return null so this screen unmounts */
  if (hasOpenedModal) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-light text-gray-900">
              Report Generated Successfully!
            </h1>
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
