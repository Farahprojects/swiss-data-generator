import React, { useState, useEffect, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useReportModal } from "@/contexts/ReportModalContext";
import { logUserError } from "@/services/errorService";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useSessionManager } from "@/hooks/useSessionManager";

interface SuccessScreenProps {
  guestId: string;
  name: string;
  email: string;
  isStripeReturn?: boolean;
}

export const SuccessScreen = forwardRef<HTMLDivElement, SuccessScreenProps>(
  ({ guestId, name, email, isStripeReturn = false }, ref) => {
    // Runtime validation
    if (!guestId || !name || !email) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 bg-white rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold text-red-600">Configuration Error</h2>
          <p className="mt-2 text-center text-gray-700">
            The success screen is missing required information (guest ID, name, or email) and cannot be displayed.
          </p>
        </div>
      );
    }

    const { open: openReportModal } = useReportModal();
    const [showError, setShowError] = useState(false);
    const [caseNumber, setCaseNumber] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const { clearSession } = useSessionManager("SuccessScreen");
    const [manualCheckFailed, setManualCheckFailed] = useState(false);
    const [modalOpened, setModalOpened] = useState(false);

    // --- Main Polling Mechanism ---
    useEffect(() => {
      if (!guestId) return;

      const POLLING_INTERVAL_MS = 1000;
      const POLLING_TIMEOUT_MS = 14000;
      let elapsedTime = 0;

      const intervalId = setInterval(async () => {
        elapsedTime += POLLING_INTERVAL_MS;

        // Check for timeout
        if (elapsedTime >= POLLING_TIMEOUT_MS) {
          clearInterval(intervalId);
          console.error(`[SuccessScreen] Polling timed out for guestId: ${guestId}`);
          const loggedCaseNumber = await logUserError({
            guestReportId: guestId,
            errorType: 'POLLING_TIMEOUT',
            errorMessage: `Polling for report signal timed out after ${POLLING_TIMEOUT_MS / 1000} seconds.`,
          });
          setCaseNumber(loggedCaseNumber);
          setShowError(true);
          return;
        }

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

    const handleManualCheck = async () => {
      setIsChecking(true);
      setManualCheckFailed(false);
      try {
        const { data, error } = await supabase
          .from('report_ready_signals')
          .select('id')
          .eq('guest_report_id', guestId)
          .limit(1);

        if (!error && data && data.length > 0) {
          openReportModal(guestId);
          setModalOpened(true);
        } else {
          if (error) {
            console.error("Error manually checking for report signal:", error);
          }
          setManualCheckFailed(true);
        }
      } catch (e) {
        console.error("Failed to manually check for report", e);
        setManualCheckFailed(true);
      } finally {
        setIsChecking(false);
      }
    };

    if (modalOpened) return null;

    if (showError) {
      return (
        <div ref={ref} className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-light text-gray-900">We've hit a small issue</h1>
              <p className="text-gray-600">
                There was a delay preparing the report for <span className="font-semibold">{name || 'you'}</span>. 
                An error has been logged, and our team will investigate.
              </p>
              {manualCheckFailed && (
                <p className="text-sm text-amber-700 pt-2">
                  We checked again, but your report is still being prepared. You can try again in a few moments, or return home.
                </p>
              )}
              {caseNumber && (
                <p className="text-sm text-gray-500 pt-2">
                  Your case number is: <span className="font-semibold">{caseNumber}</span>
                </p>
              )}
              <p className="text-sm text-gray-500">
                We will get back to you at <span className="font-semibold">{email || 'you'}</span> within 24 hours.
              </p>
            </div>
          </div>
          <div className="pt-4">
            <Button 
              onClick={manualCheckFailed ? () => clearSession({}) : handleManualCheck} 
              disabled={isChecking} 
              className="w-full"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                manualCheckFailed ? "Return Home" : "Check Status Now"
              )}
            </Button>
          </div>
        </div>
      );
    }

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
              {name ? `Your report for ${name} is being prepared.` : "Your report is being prepared."}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 font-medium">Name:</span>
            <span className="font-normal text-gray-900">{name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 font-medium">Email:</span>
            <span className="font-normal text-gray-900">{email}</span>
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
