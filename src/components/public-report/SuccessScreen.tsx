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

  // --- Main WebSocket Listener ---
  useEffect(() => {
    if (!guestId) return;

    const checkAndListen = async () => {
      // 1. Check if the signal already exists.
      const { data: existingSignal, error: checkError } = await supabase
        .from('report_ready_signals')
        .select('id')
        .eq('guest_report_id', guestId)
        .limit(1);

      if (checkError) {
        console.error('[SuccessScreen] Error checking for existing signal:', checkError);
      }

      if (existingSignal && existingSignal.length > 0) {
        console.log(`[SuccessScreen] Signal for ${guestId} already exists. Opening report immediately.`);
        openReportModal(guestId);
        return; // Signal found, no need to listen.
      }

      // 2. If no signal, set up the WebSocket listener.
      const channel = supabase.channel(`ready_${guestId}`);

      const handleNewSignal = () => {
        console.log(`[SuccessScreen] WebSocket signal received for ${guestId}. Opening report.`);
        openReportModal(guestId);
        channel.unsubscribe();
      };
      
      channel
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'report_ready_signals', 
          filter: `guest_report_id=eq.${guestId}` 
        }, handleNewSignal)
        .subscribe();

      console.log(`[SuccessScreen] Subscribed to WebSocket for guestId: ${guestId}`);

      // Return the cleanup function for the channel
      return () => {
        console.log(`[SuccessScreen] Unsubscribing from WebSocket for guestId: ${guestId}`);
        try { channel.unsubscribe(); } catch {}
      };
    };

    let cleanup: (() => void) | undefined;
    checkAndListen().then(cleanupFn => {
      if (cleanupFn) {
        cleanup = cleanupFn;
      }
    });

    return () => {
      cleanup?.();
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
            Listening for report...
          </span>
        </div>
      </div>
    </div>
  );
});
