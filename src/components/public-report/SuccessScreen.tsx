import React, { useState, useEffect, useCallback } from 'react';
import { useReportModal } from '@/contexts/ReportModalContext';
import { supabase } from '@/integrations/supabase/client';
import { sessionManager } from '@/utils/sessionManager';

interface SuccessScreenProps {
  name: string;
  email: string;
  guestReportId?: string;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({ 
  name, 
  email, 
  guestReportId 
}) => {
  const { open, isOpen } = useReportModal();
  const [hasOpenedModal, setHasOpenedModal] = useState(false);

  // Register with SessionManager for state reset
  useEffect(() => {
    const componentId = 'SuccessScreen';
    
    const stateResetCallback = () => {
      console.log('🔄 SuccessScreen: State reset triggered by SessionManager');
      setHasOpenedModal(false);
    };

    sessionManager.registerStateReset(componentId, stateResetCallback);

    return () => {
      sessionManager.unregisterStateReset(componentId);
    };
  }, []);

  const logSuccessScreen = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    console[level](`[SuccessScreen] ${message}`, data);
  };

  const fetchAndOpenReport = useCallback(async () => {
    // Just open the modal with the guestReportId - the modal will handle fetching the data
    open(guestReportId);
    setHasOpenedModal(true);
  }, [guestReportId, open]);

  // Polling mechanism for report_ready_signals
  useEffect(() => {
    if (hasOpenedModal) return;

    const pollInterval = setInterval(async () => {
      try {
        // Query report_ready_signals table for current guest_report_id
        const { data, error } = await supabase
          .from('report_ready_signals')
          .select('guest_report_id')
          .eq('guest_report_id', guestReportId)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 is "not found" - which is expected while waiting
          logSuccessScreen('error', 'Error polling report_ready_signals', { error });
          return;
        }

        // If a row exists, the signal is found
        if (data && data.guest_report_id === guestReportId) {
          clearInterval(pollInterval);
          fetchAndOpenReport();
        }
      } catch (error) {
        logSuccessScreen('error', 'Exception during polling', { error });
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [guestReportId, fetchAndOpenReport, hasOpenedModal]);

  // Log modal state changes for debugging
  useEffect(() => {
    logSuccessScreen('info', 'Modal state changed', { isOpen, hasOpenedModal });
  }, [isOpen, hasOpenedModal]);

  // Hide the success screen when modal is open
  if (isOpen) {
    logSuccessScreen('info', 'Success screen hidden - modal is open');
    return null;
  }

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

