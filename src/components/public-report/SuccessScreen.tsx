import React, { useState, useEffect, useRef, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useReportModal } from "@/contexts/ReportModalContext";

interface SuccessScreenProps {
  guestId: string;
  name?: string;
  email?: string;
  isStripeReturn?: boolean;
}

export const SuccessScreen = forwardRef<HTMLDivElement, SuccessScreenProps>(
({ guestId, name, email, isStripeReturn = false }, ref) => {
  const { open: openReportModal } = useReportModal();
  const [guestData, setGuestData] = useState<{name: string, email: string} | null>(null);

  // --- Main Polling Mechanism ---
  useEffect(() => {
    if (!guestId) return;

    const intervalId = setInterval(async () => {
      console.log(`[SuccessScreen] Polling for report signal for guestId: ${guestId}`);
      const { data, error } = await supabase
        .from('report_ready_signals')
        .select('id')
        .eq('guest_report_id', guestId)
        .limit(1);

      if (error) {
        console.error('[SuccessScreen] Error polling for report signal:', error);
        // Optional: stop polling on error or just continue
        return;
      }

      if (data && data.length > 0) {
        console.log(`[SuccessScreen] Polling found signal for ${guestId}. Opening report.`);
        openReportModal(guestId);
        clearInterval(intervalId); // Stop polling once the signal is found
      }
    }, 1000); // Poll every 1 second

    // Cleanup function to clear the interval when the component unmounts
    return () => {
      console.log(`[SuccessScreen] Unmounting, clearing polling for guestId: ${guestId}`);
      clearInterval(intervalId);
    };
  }, [guestId, openReportModal]);

  return (
    <div ref={ref} className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
      <div className="space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-light text-gray-900">Report Request Received!</h1>
          <p className="text-gray-600">
            {(name || guestData?.name) ? `Your report for ${name || guestData?.name} is being prepared.` : "Your report is being prepared."}
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-left">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 font-medium">Name:</span>
          <span className="font-normal text-gray-900">{name || guestData?.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 font-medium">Email:</span>
          <span className="font-normal text-gray-900">{email || guestData?.email}</span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Your report will open automatically when it's ready.
        </p>

        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
          <span className="text-sm text-gray-600">
            Finalizing your report...
          </span>
        </div>
      </div>
    </div>
  );
});
