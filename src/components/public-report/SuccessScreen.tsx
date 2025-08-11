import React, { useState, useEffect, useRef, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useReportModal } from "@/contexts/ReportModalContext";

interface SuccessScreenProps {
  guestId: string;
}

export const SuccessScreen = forwardRef<HTMLDivElement, SuccessScreenProps>(
({ guestId }, ref) => {
  const { open: openReportModal } = useReportModal();
  const [guestData, setGuestData] = useState<{name: string, email: string} | null>(null);

  // --- Main WebSocket Listener ---
  useEffect(() => {
    if (!guestId) return;

    // Fetch guest details for UI display
    const fetchGuestDetails = async () => {
      const { data, error } = await supabase
        .from("guest_reports")
        .select("email, name:report_data->>name, person_a_name:report_data->person_a->>name, person_a_email:report_data->person_a->>email")
        .eq("id", guestId)
        .single();
      
      if (data) {
        const displayName = data.person_a_name ?? data.name ?? "";
        const displayEmail = data.person_a_email ?? data.email ?? "";
        setGuestData({ name: displayName, email: displayEmail });
      } else {
        console.error(`[SuccessScreen] Failed to fetch guest details for ${guestId}`, error);
      }
    };
    
    fetchGuestDetails();

    // Setup WebSocket listener
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

    return () => {
      console.log(`[SuccessScreen] Unsubscribing from WebSocket for guestId: ${guestId}`);
      channel.unsubscribe();
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
            {guestData?.name ? `Your report for ${guestData.name} is being prepared.` : "Your report is being prepared."}
          </p>
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
